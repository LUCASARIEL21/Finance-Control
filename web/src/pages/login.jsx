import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

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
  const [formData, setFormData] = useState({
    nome: '',
    dataNascimento: '',
    email: '',
    senha: '',
    confirmSenha: ''
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!isLogin) {
        const erroValidacao = validarCadastro(formData);
        if (erroValidacao) {
          alert(erroValidacao);
          return;
        }

        const response = await api.post('/register', {
          nome: normalizarNome(formData.nome),
          dataNascimento: formData.dataNascimento,
          email: formData.email.trim().toLowerCase(),
          senha: formData.senha,
          confirmSenha: formData.confirmSenha,
        });

        alert(response.data.message);
        setIsLogin(true);
      } else {
        const response = await api.post('/login', {
          email: formData.email.trim().toLowerCase(),
          senha: formData.senha
        });

        if (response.data.token) {
          try {
            localStorage.setItem('token', response.data.token);
            navigate('/home');
          } catch (storageError) {
            console.error('Erro ao acessar localStorage:', storageError);
            alert('Erro ao armazenar sessão. Verifique as configurações do navegador.');
          }
        } else {
          alert('Erro ao logar. Verifique suas credenciais.');
        }
      }
    } catch (error) {
      console.error('Erro:', error.response?.data?.error || error.message);
      
      if (error.response?.status === 401) {
        alert('Credenciais inválidas. Verifique seu e-mail e senha.');
      } else {
        alert('Erro: ' + (error.response?.data?.error || 'Tente novamente mais tarde.'));
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-teal-600 text-white">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 text-center text-gray-700">
        <div className="flex justify-between mb-4">
          <button 
            className={`w-1/2 p-2 ${isLogin ? 'border-b-2 border-teal-600 font-bold' : ''}`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button 
            className={`w-1/2 p-2 ${!isLogin ? 'border-b-2 border-teal-600 font-bold' : ''}`}
            onClick={() => setIsLogin(false)}
          >
            Cadastro
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {!isLogin && (
            <>
              <input type="text" name="nome" value={formData.nome} placeholder="Nome completo" className="border p-2 rounded" onChange={handleChange} minLength={5} required />
              <input type="date" name="dataNascimento" value={formData.dataNascimento} className="border p-2 rounded" onChange={handleChange} max={new Date().toISOString().split('T')[0]} required />
            </>
          )}
          <input type="email" name="email" value={formData.email} placeholder="E-mail" className="border p-2 rounded" onChange={handleChange} required />
          <input type="password" name="senha" value={formData.senha} placeholder="Senha" className="border p-2 rounded" onChange={handleChange} minLength={12} required />
          {!isLogin && <input type="password" name="confirmSenha" value={formData.confirmSenha} placeholder="Confirmar Senha" className="border p-2 rounded" onChange={handleChange} required />}
          <button type="submit" className="bg-teal-600 text-white p-2 rounded hover:bg-teal-700">
            {isLogin ? 'Logar' : 'Cadastrar'}
          </button>
        </form>

        {isLogin && (
          <p className="mt-4 text-sm">Ainda não é cadastrado? <button onClick={() => setIsLogin(false)} className="text-teal-600 underline">Cadastre-se</button></p>
        )}
      </div>
    </div>
  );
};

export default Login;