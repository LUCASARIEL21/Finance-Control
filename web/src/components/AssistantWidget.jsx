import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FaCommentDots, FaPaperPlane, FaRobot, FaTimes } from 'react-icons/fa';
import api from '../services/api';

const quickPrompts = [
  'Como está meu mês?',
  'Maiores gastos',
  'Minha carteira',
  'Dica de economia',
];

function AssistantWidget() {
  const location = useLocation();
  const messagesEndRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Olá! Sou sua assistente financeira. Posso ajudar com resumo do mês, gastos, carteira e dicas.',
    },
  ]);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  if (location.pathname === '/') return null;

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextUserMessage = { id: `${Date.now()}-u`, role: 'user', text: trimmed };
    const updatedMessages = [...messages, nextUserMessage];

    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const history = updatedMessages
        .filter((item) => item.role === 'assistant' || item.role === 'user')
        .slice(-8)
        .map((item) => ({ role: item.role, content: item.text }));

      const response = await api.post('/assistant/chat', {
        message: trimmed,
        history,
      });

      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-a`, role: 'assistant', text: response.data.reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-err`, role: 'assistant', text: 'Erro ao consultar. Tente novamente.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 flex h-[480px] w-[330px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex shrink-0 items-center justify-between bg-teal-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500">
                <FaRobot className="text-sm" />
              </div>
              <div>
                <p className="text-sm font-extrabold leading-none">Finwise AI</p>
                <p className="mt-0.5 text-[10px] leading-none text-teal-100">Assistente financeira</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 text-white/70 hover:bg-teal-700 hover:text-white"
              aria-label="Fechar assistente"
            >
              <FaTimes />
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 px-3 py-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[88%] rounded-2xl px-3 py-2 text-[13px] leading-snug shadow-sm ${msg.role === 'assistant' ? 'border border-slate-200 bg-white text-slate-700' : 'ml-auto bg-teal-600 text-white'}`}
              >
                {msg.text}
              </div>
            ))}
            {loading && (
              <div className="max-w-[70%] animate-pulse rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-400 shadow-sm">
                Analisando...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="shrink-0 flex flex-wrap gap-1.5 border-t border-slate-100 bg-white px-3 py-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                disabled={loading}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="shrink-0 flex items-center gap-2 border-t border-slate-100 bg-white px-3 py-2.5">
            <input
              className="field min-w-0 flex-1 py-1.5 text-[13px]"
              placeholder="Digite sua mensagem..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={300}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white transition hover:bg-teal-700 disabled:opacity-50"
              aria-label="Enviar mensagem"
            >
              <FaPaperPlane className="text-xs" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-xl transition hover:bg-teal-700 active:scale-95"
        aria-label={open ? 'Fechar assistente' : 'Abrir assistente'}
      >
        {open ? <FaTimes className="text-lg" /> : <FaCommentDots className="text-xl" />}
      </button>
    </div>
  );
}

export default AssistantWidget;
