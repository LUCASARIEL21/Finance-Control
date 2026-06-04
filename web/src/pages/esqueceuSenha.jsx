import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaEnvelope } from 'react-icons/fa';
import api from '../services/api';
import { useToast } from '../components/ToastProvider';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EsqueceuSenha = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!emailRegex.test(normalizedEmail)) {
      toast('Informe um e-mail válido.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post('/forgot-password', { email: normalizedEmail }, { timeout: 15000 });

      setSubmitted(true);
      toast(response.data?.message || 'Verifique seu e-mail para continuar.', 'success');
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        toast('A solicitação demorou demais. Tente novamente em instantes.', 'error');
        return;
      }
      toast(error.response?.data?.error || 'Não foi possível processar sua solicitação.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="app-shell flex items-center justify-center">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <h1 className="text-2xl font-extrabold text-slate-900">Recuperar senha</h1>
        <p className="mt-2 text-sm text-slate-500">
          Informe seu e-mail para receber um link único de redefinição.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="relative">
            <FaEnvelope className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Seu e-mail"
              className="field pl-10"
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Enviando...' : 'Confirmar'}
          </button>
        </form>

        {submitted && (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Se o e-mail estiver cadastrado, você receberá a mensagem com o link de redefinição.
          </p>
        )}

        <p className="mt-5 text-center text-sm text-slate-500">
          Lembrou sua senha?{' '}
          <Link to="/" className="font-semibold text-teal-700 underline">
            Voltar para o login
          </Link>
        </p>
      </section>
    </main>
  );
};

export default EsqueceuSenha;
