import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
        if (formData.senha !== formData.confirmSenha) {
          alert('As senhas não coincidem!');
          return;
        }

        const response = await axios.post('http://localhost:5000/api/register', {
          nome: formData.nome,
          dataNascimento: formData.dataNascimento,
          email: formData.email,
          senha: formData.senha
        }, { withCredentials: true });

        alert(response.data.message);
        setIsLogin(true);
      } else {
        const response = await axios.post('http://localhost:5000/api/login', {
          email: formData.email,
          senha: formData.senha
        }, { withCredentials: true });

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
              <input type="text" name="nome" value={formData.nome} placeholder="Nome completo" className="border p-2 rounded" onChange={handleChange} required />
              <input type="date" name="dataNascimento" value={formData.dataNascimento} className="border p-2 rounded" onChange={handleChange} required />
            </>
          )}
          <input type="email" name="email" value={formData.email} placeholder="E-mail" className="border p-2 rounded" onChange={handleChange} required />
          <input type="password" name="senha" value={formData.senha} placeholder="Senha" className="border p-2 rounded" onChange={handleChange} required />
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