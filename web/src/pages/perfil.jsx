import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function Perfil() {
  const [user, setUser] = useState({ nome: "", dataNascimento: "", email: "" });
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const navigate = useNavigate();

  const formatarData = (dataISO) => {
    if (!dataISO) return "";
    return format(new Date(dataISO), "dd/MM/yyyy", { locale: ptBR });
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
          const token = localStorage.getItem('token');
          if (!token) {
              console.error("Usuário não autenticado");
              return;
          }
  
          const response = await axios.get('http://localhost:5000/api/perfil', {
              headers: { Authorization: `Bearer ${token}` }
          });
  
          setUser(response.data);
      } catch (error) {
          console.error("Erro ao buscar dados do usuário", error.response?.data || error.message);
      }
    };

    fetchUser();
  }, []);

  if (!user) {
    return <p>Carregando...</p>;
  }

  const handlePasswordChange = async () => {
    if (novaSenha !== confirmarSenha) {
      alert("As senhas não coincidem!");
      return;
    }
  
    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        alert("Token não encontrado. Você precisa estar autenticado.");
        return;
      }
  
      const response = await axios.put(
        "http://localhost:5000/api/trocar-senha",
        {
          senhaAtual,
          novaSenha,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
  
      alert("Senha alterada com sucesso!");
    } catch (error) {
      console.error("Erro ao alterar senha", error.response?.data || error.message);
      alert(`Erro: ${error.response?.data?.mensagem || error.message}`);
    }
  };
  

  const handleGoHome = () => {
    navigate('/home');
  };

  return (
    <div className="flex flex-col items-center font-sans bg-gray-200 min-h-screen">
      <header className="bg-teal-600 text-white w-full py-6 flex justify-between items-center px-6">
        <h1 className="text-2xl font-bold">Perfil do Usuário</h1>
        <button
          onClick={handleGoHome}
          className="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600"
        >
          Home
        </button>
      </header>
      <div className="bg-white p-6 mt-6 w-11/12 max-w-2xl rounded-md shadow-md text-black">
        <h2 className="text-xl font-bold text-teal-600 mb-4">
          Informações Pessoais
        </h2>
        <p>
          <strong>Nome:</strong> {user.nome}
        </p>
        <p>
          <strong>Data de Nascimento:</strong> {formatarData(user.dataNascimento)}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
      </div>
      <div className="bg-white p-6 mt-6 w-11/12 max-w-2xl rounded-md shadow-md">
        <h2 className="text-xl font-bold text-teal-600 mb-4">Alterar Senha</h2>
        <input
          type="password"
          placeholder="Senha Atual"
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
          className="border p-2 w-full rounded-md mb-2"
        />
        <input
          type="password"
          placeholder="Nova Senha"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          className="border p-2 w-full rounded-md mb-2"
        />
        <input
          type="password"
          placeholder="Confirmar Nova Senha"
          value={confirmarSenha}
          onChange={(e) => setConfirmarSenha(e.target.value)}
          className="border p-2 w-full rounded-md mb-4"
        />
        <button
          onClick={handlePasswordChange}
          className="bg-teal-500 text-white px-4 py-2 w-full rounded-md hover:bg-teal-600"
        >
          Alterar Senha
        </button>
      </div>
    </div>
  );
}

export default Perfil;