const express = require('express');
const { pool } = require('../database/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
});

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:latest';
const OLLAMA_TIMEOUT_MS = toPositiveInt(process.env.OLLAMA_TIMEOUT_MS, 12000);
const OLLAMA_NUM_PREDICT = toPositiveInt(process.env.OLLAMA_NUM_PREDICT, 140);
const OLLAMA_KEEP_ALIVE = process.env.OLLAMA_KEEP_ALIVE || '15m';
const OLLAMA_TEMPERATURE = Number.isFinite(Number(process.env.OLLAMA_TEMPERATURE))
  ? Number(process.env.OLLAMA_TEMPERATURE)
  : 0.15;
const MAX_HISTORY_ITEMS = toPositiveInt(process.env.ASSISTANT_MAX_HISTORY_ITEMS, 6);
const MODEL_CACHE_TTL_MS = toPositiveInt(process.env.OLLAMA_MODEL_CACHE_TTL_MS, 300000);

let modelCache = {
  expiresAt: 0,
  names: [],
};

const ASSISTANT_SCOPE_MESSAGE =
  'Eu so posso responder assuntos do Finance Control: transacoes, dashboard, relatorios, investimentos, imposto de renda e seus dados financeiros cadastrados.';

const normalizePrompt = (text = '') => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const APP_SCOPE_KEYWORDS = [
  'finwise',
  'finance control',
  'financeiro',
  'transacao',
  'entrada',
  'saida',
  'gasto',
  'despesa',
  'receita',
  'saldo',
  'categoria',
  'mes',
  'ano',
  'dashboard',
  'relatorio',
  'invest',
  'carteira',
  'ativo',
  'patrimonio',
  'imposto',
  'renda',
  'declaracao',
  'perfil',
  'resumo',
  'econom',
  'orcamento',
  'meta',
  'objetivo',
  'planejamento',
  'app',
  'aplicacao',
  'sistema',
  'conta',
  'usuario',
];

const isInScopeQuestion = (message, history = []) => {
  const prompt = normalizePrompt(message);
  if (!prompt) return false;

  const hasKeyword = APP_SCOPE_KEYWORDS.some((keyword) => prompt.includes(keyword));
  if (hasKeyword) return true;

  const isShortFollowUp = prompt.length <= 40;
  if (!isShortFollowUp) return false;

  const hasFinancialContextInHistory = history.some((item) => {
    if (!item || typeof item.content !== 'string') return false;
    const previous = normalizePrompt(item.content);
    return APP_SCOPE_KEYWORDS.some((keyword) => previous.includes(keyword));
  });

  return hasFinancialContextInHistory;
};

const sanitizeHistory = (history) => {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item) => item && typeof item.content === 'string' && typeof item.role === 'string')
    .map((item) => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: item.content.trim().slice(0, 600),
    }))
    .filter((item) => item.content)
    .slice(-MAX_HISTORY_ITEMS);
};

const formatContextForPrompt = (context) => {
  const topCategorias = context.topCategorias.length
    ? context.topCategorias.map((item) => `${item.categoria}: ${currencyFormatter.format(item.total)}`).join('; ')
    : 'Sem categorias de saida relevantes no mes.';

  const transacoes = context.transacoesRecentes.length
    ? context.transacoesRecentes
      .map((item) => `${item.descricao} (${item.tipo}, ${currencyFormatter.format(item.valor)})`)
      .join('; ')
    : 'Sem transacoes recentes.';

  return [
    `Usuario: ${context.nome}`,
    `Entradas no mes: ${currencyFormatter.format(context.entradasMes)}`,
    `Saidas no mes: ${currencyFormatter.format(context.saidasMes)}`,
    `Saldo no mes: ${currencyFormatter.format(context.saldoMes)}`,
    `Top categorias: ${topCategorias}`,
    `Valor investido: ${currencyFormatter.format(context.valorInvestido)}`,
    `Valor patrimonial: ${currencyFormatter.format(context.valorPatrimonial)}`,
    `Transacoes recentes: ${transacoes}`,
  ].join('\n');
};

const resolveOllamaModel = async () => {
  const preferredModel = OLLAMA_MODEL;
  const now = Date.now();

  if (now >= modelCache.expiresAt || modelCache.names.length === 0) {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Falha ao consultar modelos do Ollama (${response.status}).`);
    }

    const data = await response.json();
    const installedModels = Array.isArray(data?.models) ? data.models : [];
    modelCache = {
      expiresAt: now + MODEL_CACHE_TTL_MS,
      names: installedModels.map((model) => model?.name).filter(Boolean),
    };
  }

  const installedNames = modelCache.names;

  if (installedNames.includes(preferredModel)) {
    return preferredModel;
  }

  const preferredBase = preferredModel.split(':')[0];
  const sameFamily = installedNames.find((name) => name.startsWith(`${preferredBase}:`));
  if (sameFamily) {
    return sameFamily;
  }

  if (installedNames.length > 0) {
    return installedNames[0];
  }

  throw new Error('Nenhum modelo Ollama instalado localmente.');
};

const callOpenSourceLLM = async ({ message, history, context }) => {
  const resolvedModel = await resolveOllamaModel();
  const systemPrompt = [
    'Você é a assistente financeira do sistema Finance Control.',
    'Responda apenas sobre funcionalidades do sistema e dados financeiros do usuário autenticado fornecidos no contexto.',
    'Nunca responda perguntas de assuntos gerais, políticos, código externo, medicina, direito, violência, conteúdo adulto ou temas fora do app.',
    `Se a pergunta estiver fora do escopo, responda exatamente: ${ASSISTANT_SCOPE_MESSAGE}`,
    'Seja objetiva, em português do Brasil, sem inventar dados e sem citar informações não presentes no contexto.',
  ].join(' ');

  const payload = {
    model: resolvedModel,
    stream: false,
    keep_alive: OLLAMA_KEEP_ALIVE,
    options: {
      temperature: OLLAMA_TEMPERATURE,
      num_predict: OLLAMA_NUM_PREDICT,
    },
    messages: [
      {
        role: 'system',
        content: `${systemPrompt}\n\nContexto do usuário:\n${formatContextForPrompt(context)}`,
      },
      ...history,
      {
        role: 'user',
        content: message,
      },
    ],
  };

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), OLLAMA_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: abortController.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Timeout ao consultar Ollama apos ${OLLAMA_TIMEOUT_MS}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Falha no Ollama (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('Resposta inválida do Ollama.');
  }

  return {
    reply: content.trim(),
    model: resolvedModel,
  };
};

const getAssistantContext = async (userId) => {
  const [profileResult, monthResult, categoryResult, investmentResult, transactionsResult] = await Promise.all([
    pool.query('SELECT nome FROM users WHERE id = $1', [userId]),
    pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor END), 0) AS entradas,
         COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor END), 0) AS saidas
       FROM transactions
       WHERE user_id = $1
         AND date_trunc('month', data) = date_trunc('month', CURRENT_DATE)`,
      [userId]
    ),
    pool.query(
      `SELECT COALESCE(c.nome, 'Sem categoria') AS categoria,
              COALESCE(SUM(t.valor), 0) AS total
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1
         AND t.tipo = 'saida'
         AND date_trunc('month', t.data) = date_trunc('month', CURRENT_DATE)
       GROUP BY COALESCE(c.nome, 'Sem categoria')
       ORDER BY total DESC
       LIMIT 3`,
      [userId]
    ),
    pool.query(
      `SELECT
         COALESCE(SUM(quantidade * preco_medio), 0) AS valor_investido,
         COALESCE(SUM(quantidade * valor_atual), 0) AS valor_patrimonial
       FROM investment_assets
       WHERE user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT descricao, tipo, valor, data
       FROM transactions
       WHERE user_id = $1
       ORDER BY data DESC
       LIMIT 5`,
      [userId]
    ),
  ]);

  const profile = profileResult.rows[0] || { nome: 'usuário' };
  const month = monthResult.rows[0] || { entradas: 0, saidas: 0 };
  const investment = investmentResult.rows[0] || { valor_investido: 0, valor_patrimonial: 0 };

  return {
    nome: String(profile.nome || 'usuário').split(' ')[0],
    entradasMes: Number(month.entradas),
    saidasMes: Number(month.saidas),
    saldoMes: Number(month.entradas) - Number(month.saidas),
    topCategorias: categoryResult.rows.map((row) => ({
      categoria: row.categoria,
      total: Number(row.total),
    })),
    valorInvestido: Number(investment.valor_investido),
    valorPatrimonial: Number(investment.valor_patrimonial),
    transacoesRecentes: transactionsResult.rows.map((row) => ({
      descricao: row.descricao,
      tipo: row.tipo,
      valor: Number(row.valor),
      data: row.data,
    })),
  };
};

const buildAssistantReply = (message, context) => {
  const prompt = normalizePrompt(message);
  const monthLabel = monthFormatter.format(new Date());
  const topCategory = context.topCategorias[0];
  const investmentGain = context.valorPatrimonial - context.valorInvestido;

  if (!prompt || prompt.includes('resumo') || prompt.includes('como estou')) {
    return [
      `Olá, ${context.nome}. Em ${monthLabel}, você registrou ${currencyFormatter.format(context.entradasMes)} em entradas e ${currencyFormatter.format(context.saidasMes)} em saídas.`,
      `Seu saldo no mês está em ${currencyFormatter.format(context.saldoMes)}.`,
      topCategory
        ? `Sua maior categoria de gasto no mês é ${topCategory.categoria}, com ${currencyFormatter.format(topCategory.total)}.`
        : 'Você ainda não possui gastos categorizados neste mês.',
      context.valorInvestido > 0
        ? `Na carteira, você tem ${currencyFormatter.format(context.valorInvestido)} investidos e patrimônio estimado de ${currencyFormatter.format(context.valorPatrimonial)}.`
        : 'Você ainda não cadastrou investimentos na carteira.',
    ].join(' ');
  }

  if (prompt.includes('gasto') || prompt.includes('categoria')) {
    if (!context.topCategorias.length) {
      return `${context.nome}, ainda não encontrei categorias de saída no mês atual para analisar.`;
    }

    return `As principais categorias de saída deste mês são: ${context.topCategorias
      .map((item) => `${item.categoria} (${currencyFormatter.format(item.total)})`)
      .join(', ')}.`;
  }

  if (prompt.includes('invest') || prompt.includes('carteira') || prompt.includes('ativo')) {
    if (context.valorInvestido <= 0) {
      return `${context.nome}, sua carteira ainda está vazia. Cadastre ativos para eu acompanhar sua evolução.`;
    }

    return `Hoje sua carteira soma ${currencyFormatter.format(context.valorPatrimonial)} para um capital investido de ${currencyFormatter.format(context.valorInvestido)}. O resultado acumulado está em ${currencyFormatter.format(investmentGain)}.`;
  }

  if (prompt.includes('transa') || prompt.includes('ultimas') || prompt.includes('recentes')) {
    if (!context.transacoesRecentes.length) {
      return `${context.nome}, você ainda não possui transações recentes cadastradas.`;
    }

    return `Suas últimas movimentações foram: ${context.transacoesRecentes
      .map((item) => `${item.descricao} (${item.tipo}, ${currencyFormatter.format(item.valor)})`)
      .join('; ')}.`;
  }

  if (prompt.includes('econom') || prompt.includes('melhorar') || prompt.includes('dica')) {
    if (topCategory && topCategory.total > context.entradasMes * 0.3) {
      return `${context.nome}, sua principal oportunidade de ajuste está em ${topCategory.categoria}, que já representa uma parcela relevante do mês. Vale revisar recorrências e definir um teto para essa categoria.`;
    }

    if (context.saldoMes < 0) {
      return `${context.nome}, você está com saldo negativo no mês. A prioridade é reduzir gastos variáveis e segurar novas despesas até voltar ao positivo.`;
    }

    return `${context.nome}, seu mês está relativamente equilibrado. Uma boa próxima ação é separar parte do saldo positivo para reserva ou investimento recorrente.`;
  }

  return `Posso te ajudar com resumo financeiro, gastos por categoria, carteira de investimentos, transações recentes e dicas de economia. Pergunte, por exemplo: "como está meu mês?".`;
};

router.post('/assistant/chat', authMiddleware, async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ mensagem: 'Envie uma mensagem para a assistente.' });
    }

    const safeHistory = sanitizeHistory(history);

    if (!isInScopeQuestion(message.trim(), safeHistory)) {
      return res.json({
        reply: ASSISTANT_SCOPE_MESSAGE,
        metadata: {
          scope: 'blocked',
        },
      });
    }

    const context = await getAssistantContext(req.user.id);
    let reply;
    let usedModel = 'fallback-rule-based';

    try {
      const llmResult = await callOpenSourceLLM({
        message: message.trim(),
        history: safeHistory,
        context,
      });
      reply = llmResult.reply;
      usedModel = llmResult.model;
    } catch (llmError) {
      console.error('Falha no LLM open source (fallback ativado):', llmError.message);
      reply = buildAssistantReply(message.trim(), context);
    }

    res.json({
      reply,
      metadata: {
        scope: 'application',
        model: usedModel,
        provider: 'ollama',
        nome: context.nome,
        entradasMes: context.entradasMes,
        saidasMes: context.saidasMes,
        saldoMes: context.saldoMes,
        topCategorias: context.topCategorias,
        valorInvestido: context.valorInvestido,
        valorPatrimonial: context.valorPatrimonial,
      },
    });
  } catch (error) {
    console.error('Erro na assistente financeira:', error);
    res.status(500).json({ mensagem: 'Erro ao consultar a assistente financeira.' });
  }
});

module.exports = router;