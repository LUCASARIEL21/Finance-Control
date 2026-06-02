import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaCheckCircle, FaCircle, FaEye, FaEyeSlash, FaLock } from 'react-icons/fa';
import api from '../services/api';
import { useToast } from '../components/ToastProvider';

const ResetarSenha = () => {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams]);
  const [loadingToken, setLoadingToken] = useState(true);
  const [tokenValido, setTokenValido] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmNovaSenha, setShowConfirmNovaSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmNovaSenha, setConfirmNovaSenha] = useState('');

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const validarToken = async () => {
      if (!token) {
        setTokenValido(false);
        setLoadingToken(false);
        return;
      }

      try {
        await api.post('/reset-password/validate', { token });
        setTokenValido(true);
      } catch (error) {
        setTokenValido(false);
        toast(error.response?.data?.error || 'Link inválido ou expirado.', 'error');
      } finally {
        setLoadingToken(false);
      }
    };

    validarToken();
  }, [token, toast]);

  const checks = [
    { label: 'Mínimo de 12 caracteres', valid: novaSenha.length >= 12 },
    { label: 'Letra maiúscula e minúscula', valid: /[A-Z]/.test(novaSenha) && /[a-z]/.test(novaSenha) },
    { label: 'Ao menos 1 número', valid: /\d/.test(novaSenha) },
    { label: 'Ao menos 1 caractere especial', valid: /[^A-Za-z0-9]/.test(novaSenha) },
    { label: 'Confirmação igual à senha', valid: !confirmNovaSenha || novaSenha === confirmNovaSenha },
  ];

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!tokenValido) {
      toast('O link de redefinição é inválido ou expirou.', 'error');
      return;
    }

    if (novaSenha !== confirmNovaSenha) {
      toast('A confirmação da senha deve ser igual à senha digitada.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post('/reset-password/confirm', {
        token,
        novaSenha,
        confirmNovaSenha,
      });

      toast(response.data?.message || 'Senha redefinida com sucesso.', 'success');
      navigate('/');
    } catch (error) {
      toast(error.response?.data?.error || 'Não foi possível redefinir a senha.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingToken) {
    return (
      <main className="app-shell flex items-center justify-center">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl sm:p-8">
          <p className="text-sm text-slate-500">Validando link...</p>
        </section>
      </main>
    );
  }

  if (!tokenValido) {
    return (
      <main className="app-shell flex items-center justify-center">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl sm:p-8">
          <h1 className="text-2xl font-extrabold text-slate-900">Link inválido</h1>
          <p className="mt-2 text-sm text-slate-500">
            Este link de redefinição expirou ou já foi utilizado.
          </p>
          <Link to="/esqueceu-senha" className="btn-primary mt-6 inline-block w-full text-center">
            Solicitar novo link
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell flex items-center justify-center">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <h1 className="text-2xl font-extrabold text-slate-900">Criar nova senha</h1>
        <p className="mt-2 text-sm text-slate-500">
          Digite e confirme sua nova senha para concluir o processo.
        </p>

        <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
          <div className="relative">
            <FaLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showNovaSenha ? 'text' : 'password'}
              value={novaSenha}
              onChange={(event) => setNovaSenha(event.target.value)}
              placeholder="Nova senha"
              className="field pl-10 pr-10"
              minLength={12}
              required
            />
            <button
              type="button"
              onClick={() => setShowNovaSenha((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
              aria-label={showNovaSenha ? 'Ocultar nova senha' : 'Mostrar nova senha'}
            >
              {showNovaSenha ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <div className="relative">
            <input
              type={showConfirmNovaSenha ? 'text' : 'password'}
              value={confirmNovaSenha}
              onChange={(event) => setConfirmNovaSenha(event.target.value)}
              placeholder="Confirme a nova senha"
              className="field pr-10"
              minLength={12}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmNovaSenha((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
              aria-label={showConfirmNovaSenha ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
            >
              {showConfirmNovaSenha ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Requisitos da nova senha</p>
            <ul className="mt-2 space-y-1">
              {checks.map((item) => (
                <li key={item.label} className={`flex items-center gap-2 text-xs ${item.valid ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {item.valid ? <FaCheckCircle /> : <FaCircle className="text-[8px]" />}
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Confirmando...' : 'Confirmar'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          <Link to="/" className="font-semibold text-teal-700 underline">
            Voltar para o login
          </Link>
        </p>
      </section>
    </main>
  );
};

export default ResetarSenha;
