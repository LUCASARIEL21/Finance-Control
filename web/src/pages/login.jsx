import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FaCheckCircle, FaCircle, FaEye, FaEyeSlash, FaLock, FaUserAlt } from 'react-icons/fa';
import { useToast } from '../components/ToastProvider';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const nomeRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ'\-\s]+$/u;

const normalizarNome = (nome) => nome.trim().replace(/\s+/g, ' ');

const dataNascimentoValida = (data) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;

  const [year, month, day] = data.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const valida =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!valida) return false;

  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  return date <= todayUtc && year >= 1900;
};

const senhaTemParteDoNome = (senha, nome) => {
  const senhaLower = senha.toLowerCase();
  const partesNome = normalizarNome(nome)
    .toLowerCase()
    .split(' ')
    .map((parte) => parte.replace(/[^a-zà-öø-ÿ]/g, ''))
    .filter((parte) => parte.length >= 3);

  return partesNome.some((parte) => senhaLower.includes(parte));
};

const validarCadastro = ({ nome, dataNascimento, email, senha, confirmSenha }) => {
  const nomeNormalizado = normalizarNome(nome);
  const nomePartes = nomeNormalizado.split(' ').filter(Boolean);

  if (nomePartes.length < 2 || !nomeRegex.test(nomeNormalizado) || nomePartes.some((parte) => parte.length < 2)) {
    return 'Informe um nome completo válido (nome e sobrenome, apenas letras).';
  }

  if (!dataNascimentoValida(dataNascimento)) {
    return 'Informe uma data de nascimento válida.';
  }

  if (!emailRegex.test(email)) {
    return 'Informe um e-mail válido.';
  }

  const senhaForte =
    senha.length >= 12 &&
    /[A-Z]/.test(senha) &&
    /[a-z]/.test(senha) &&
    /\d/.test(senha) &&
    /[^A-Za-z0-9]/.test(senha);

  if (!senhaForte) {
    return 'A senha deve ter no mínimo 12 caracteres, com letra maiúscula, minúscula, número e caractere especial.';
  }

  if (senhaTemParteDoNome(senha, nomeNormalizado)) {
    return 'A senha não pode conter partes do nome completo.';
  }

  if (senha !== confirmSenha) {
    return 'A confirmação da senha deve ser igual à senha digitada.';
  }

  return null;
};

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmSenha, setShowConfirmSenha] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    dataNascimento: '',
    email: '',
    senha: '',
    confirmSenha: ''
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      if (!isLogin) {
        const erroValidacao = validarCadastro(formData);
        if (erroValidacao) {
          toast(erroValidacao, 'error');
          return;
        }

        const response = await api.post('/register', {
          nome: normalizarNome(formData.nome),
          dataNascimento: formData.dataNascimento,
          email: formData.email.trim().toLowerCase(),
          senha: formData.senha,
          confirmSenha: formData.confirmSenha,
        });

        toast(response.data.message, 'success');
        setIsLogin(true);
        setFormData((prev) => ({
          ...prev,
          senha: '',
          confirmSenha: '',
        }));
      } else {
        const response = await api.post('/login', {
          email: formData.email.trim().toLowerCase(),
          senha: formData.senha
        });

        if (response.data?.token) {
          localStorage.setItem('token', response.data.token);
        }

        navigate('/home');
      }
    } catch (error) {
      console.error('Erro:', error.response?.data?.error || error.message);
      
      if (error.response?.status === 401) {
        toast('Credenciais invalidas. Verifique seu e-mail e senha.', 'error');
      } else {
        toast(error.response?.data?.error || 'Tente novamente mais tarde.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const passwordChecks = [
    { label: 'Minimo de 12 caracteres', valid: formData.senha.length >= 12 },
    { label: 'Letra maiuscula e minuscula', valid: /[A-Z]/.test(formData.senha) && /[a-z]/.test(formData.senha) },
    { label: 'Ao menos 1 numero', valid: /\d/.test(formData.senha) },
    { label: 'Ao menos 1 caractere especial', valid: /[^A-Za-z0-9]/.test(formData.senha) },
    {
      label: 'Sem partes do nome completo',
      valid: !formData.nome || !senhaTemParteDoNome(formData.senha, formData.nome),
    },
    {
      label: 'Confirmacao igual a senha',
      valid: !formData.confirmSenha || formData.senha === formData.confirmSenha,
    },
  ];

  return (
    <main className="app-shell flex items-center justify-center">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-[1.1fr_1fr]">
        <div className="hidden bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-500 p-8 text-white lg:block">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">Finwise</span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight">Seu controle financeiro em um unico lugar.</h1>
          <p className="mt-4 max-w-sm text-sm text-teal-50">Acompanhe entradas e saidas com uma experiencia simples, segura e desenhada para o dia a dia.</p>
          <div className="mt-10 space-y-3 text-sm text-teal-50">
            <p className="rounded-xl border border-white/25 bg-white/10 px-4 py-3">Resumo financeiro em tempo real</p>
            <p className="rounded-xl border border-white/25 bg-white/10 px-4 py-3">Seguranca com validacoes robustas</p>
            <p className="rounded-xl border border-white/25 bg-white/10 px-4 py-3">Visual limpo para desktop e mobile</p>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="mb-6 flex gap-2 rounded-xl bg-slate-100 p-1">
            <button
              className={`w-1/2 rounded-lg px-3 py-2 text-sm font-bold transition ${isLogin ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}
              onClick={() => setIsLogin(true)}
              type="button"
            >
              Login
            </button>
            <button
              className={`w-1/2 rounded-lg px-3 py-2 text-sm font-bold transition ${!isLogin ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}
              onClick={() => setIsLogin(false)}
              type="button"
            >
              Cadastro
            </button>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900">{isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}</h2>
          <p className="mt-1 text-sm text-slate-500">{isLogin ? 'Entre para continuar.' : 'Preencha os dados para comecar.'}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            {!isLogin && (
              <>
                <div className="relative">
                  <FaUserAlt className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" name="nome" value={formData.nome} placeholder="Nome completo" className="field pl-10" onChange={handleChange} minLength={5} required />
                </div>
                <input type="date" name="dataNascimento" value={formData.dataNascimento} className="field" onChange={handleChange} max={new Date().toISOString().split('T')[0]} required />
              </>
            )}

            <input type="email" name="email" value={formData.email} placeholder="E-mail" className="field" onChange={handleChange} required />

            <div className="relative">
              <FaLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type={showSenha ? 'text' : 'password'} name="senha" value={formData.senha} placeholder="Senha" className="field pl-10 pr-10" onChange={handleChange} minLength={12} required />
              <button
                type="button"
                onClick={() => setShowSenha((prev) => !prev)}
                aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
              >
                {showSenha ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            {!isLogin && (
              <div className="relative">
                <input type={showConfirmSenha ? 'text' : 'password'} name="confirmSenha" value={formData.confirmSenha} placeholder="Confirmar senha" className="field pr-10" onChange={handleChange} required />
                <button
                  type="button"
                  onClick={() => setShowConfirmSenha((prev) => !prev)}
                  aria-label={showConfirmSenha ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                >
                  {showConfirmSenha ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            )}

            {!isLogin && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Requisitos de senha</p>
                <ul className="mt-2 space-y-1">
                  {passwordChecks.map((item) => (
                    <li key={item.label} className={`flex items-center gap-2 text-xs ${item.valid ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {item.valid ? <FaCheckCircle /> : <FaCircle className="text-[8px]" />}
                      <span>{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? 'Processando...' : isLogin ? 'Entrar' : 'Cadastrar'}
            </button>

            {isLogin && (
              <p className="text-right text-sm">
                <Link to="/esqueceu-senha" className="font-semibold text-teal-700 underline">
                  Esqueceu a senha?
                </Link>
              </p>
            )}
          </form>

          {isLogin && (
            <p className="mt-4 text-center text-sm text-slate-500">
              Ainda nao e cadastrado?{' '}
              <button onClick={() => setIsLogin(false)} className="font-semibold text-teal-700 underline" type="button">
                Cadastre-se
              </button>
            </p>
          )}
        </div>
      </section>
    </main>
  );
};

export default Login;