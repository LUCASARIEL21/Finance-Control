import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppMenu from '../components/AppMenu';
import api from '../services/api';
import { useToast } from '../components/ToastProvider';

const quickPrompts = [
  'Como está meu mês?',
  'Quais são meus maiores gastos?',
  'Como está minha carteira?',
  'Me dê uma dica de economia',
];

function Assistente() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Sou sua assistente financeira. Posso resumir seu mês, analisar gastos, acompanhar investimentos e sugerir próximos passos com base apenas nos seus dados financeiros.',
    },
  ]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
    }
  }, [navigate]);

  const sendMessage = async (messageText) => {
    const trimmed = messageText.trim();
    if (!trimmed || loading) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    const userMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post(
        '/assistant/chat',
        { message: trimmed },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          text: response.data.reply,
        },
      ]);
    } catch (error) {
      toast(error.response?.data?.mensagem || 'Erro ao consultar a assistente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await sendMessage(input);
  };

  return (
    <main className="app-shell">
      <AppMenu />

      <section className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="panel p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Assistente IA</p>
          <h2 className="mt-2 text-2xl font-extrabold text-slate-900">Orientacao financeira individual</h2>
          <p className="mt-3 text-sm text-slate-600">
            A assistente consulta apenas os seus dados financeiros, transacoes e carteira. Credenciais, senha e dados de seguranca nao entram na analise.
          </p>

          <div className="mt-5 space-y-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                className="btn-ghost w-full text-left"
              >
                {prompt}
              </button>
            ))}
          </div>
        </aside>

        <section className="panel flex min-h-[70vh] flex-col overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-lg font-extrabold text-slate-900">Conversa</h3>
            <p className="text-sm text-slate-500">Pergunte sobre gastos, saldo, investimentos ou recomendacoes simples.</p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4 sm:px-5">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`max-w-3xl rounded-2xl px-4 py-3 text-sm shadow-sm ${message.role === 'assistant' ? 'border border-slate-200 bg-white text-slate-700' : 'ml-auto bg-teal-600 text-white'}`}
              >
                {message.text}
              </article>
            ))}

            {loading && (
              <div className="max-w-xs rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                Analisando seus dados...
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="field"
                placeholder="Ex.: como está meu mês?"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={300}
              />
              <button className="btn-primary sm:min-w-[140px]" disabled={loading} type="submit">
                {loading ? 'Consultando...' : 'Enviar'}
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}

export default Assistente;