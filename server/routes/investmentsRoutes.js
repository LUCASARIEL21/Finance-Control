const express = require('express');
const { pool } = require('../database/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const mapAsset = (row) => ({
  id: row.id,
  tipo: row.tipo,
  nome: row.nome,
  ticker: row.ticker,
  quantidade: Number(row.quantidade),
  precoMedio: Number(row.preco_medio),
  valorAtual: Number(row.valor_atual),
  dataAquisicao: row.data_aquisicao,
  valorInvestido: Number(row.quantidade) * Number(row.preco_medio),
  valorPatrimonial: Number(row.quantidade) * Number(row.valor_atual),
});

router.get('/investments/assets', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, tipo, nome, ticker, quantidade, preco_medio, valor_atual, data_aquisicao
       FROM investment_assets
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows.map(mapAsset));
  } catch (error) {
    console.error('Erro ao buscar ativos:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar ativos.' });
  }
});

router.post('/investments/assets', authMiddleware, async (req, res) => {
  try {
    const { tipo, nome, ticker, quantidade, precoMedio, valorAtual, dataAquisicao } = req.body;

    if (!tipo || !nome) {
      return res.status(400).json({ mensagem: 'Tipo e nome do ativo são obrigatórios.' });
    }

    const result = await pool.query(
      `INSERT INTO investment_assets (user_id, tipo, nome, ticker, quantidade, preco_medio, valor_atual, data_aquisicao)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, tipo, nome, ticker, quantidade, preco_medio, valor_atual, data_aquisicao`,
      [
        req.user.id,
        tipo,
        nome,
        ticker || null,
        Number(quantidade || 0),
        Number(precoMedio || 0),
        Number(valorAtual || 0),
        dataAquisicao || null,
      ]
    );

    res.status(201).json(mapAsset(result.rows[0]));
  } catch (error) {
    console.error('Erro ao criar ativo:', error);
    res.status(500).json({ mensagem: 'Erro ao criar ativo.' });
  }
});

router.delete('/investments/assets/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM investment_assets
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ mensagem: 'Ativo não encontrado.' });
    }

    res.json({ mensagem: 'Ativo removido com sucesso.' });
  } catch (error) {
    console.error('Erro ao remover ativo:', error);
    res.status(500).json({ mensagem: 'Erro ao remover ativo.' });
  }
});

router.get('/investments/summary', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         COALESCE(SUM(quantidade * preco_medio), 0) AS valor_investido,
         COALESCE(SUM(quantidade * valor_atual), 0) AS valor_patrimonial
       FROM investment_assets
       WHERE user_id = $1`,
      [req.user.id]
    );

    const invested = Number(result.rows[0].valor_investido);
    const portfolio = Number(result.rows[0].valor_patrimonial);

    res.json({
      valorInvestido: invested,
      valorPatrimonial: portfolio,
      lucroPrejuizo: portfolio - invested,
      rentabilidadePercentual: invested > 0 ? ((portfolio - invested) / invested) * 100 : 0,
    });
  } catch (error) {
    console.error('Erro ao gerar resumo de investimentos:', error);
    res.status(500).json({ mensagem: 'Erro ao gerar resumo de investimentos.' });
  }
});

module.exports = router;