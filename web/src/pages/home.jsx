import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaArrowUp, FaArrowDown, FaTrash, FaUserCircle } from 'react-icons/fa';
import '../index.css';

function Home() {
  const [transactions, setTransactions] = useState([]);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState('entrada');
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return navigate('/');
        
        const response = await axios.get('http://localhost:5000/api/user', {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUser(response.data);
      } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error.response?.data || error.message);
      }
    };

    fetchUserData();
  }, [navigate]);

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get("http://localhost:5000/api/transactions", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setTransactions(response.data);
    } catch (error) {
      console.error("Erro ao buscar transações:", error.response?.data || error.message);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.post("http://localhost:5000/api/transactions", {
        descricao,
        valor: parseFloat(valor),
        tipo,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setTransactions([...transactions, response.data]);
      setDescricao("");
      setValor("");
      setTipo("entrada");
    } catch (error) {
      console.error("Erro ao adicionar transação:", error.response?.data || error.message);
    }
  };

  const handleDeleteTransaction = async (id) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.delete(`http://localhost:5000/api/transactions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setTransactions(transactions.filter((t) => t._id !== id));
    } catch (error) {
      console.error('Erro ao deletar transação', error.response?.data || error.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const totalIncome = transactions.filter(t => t.tipo === 'entrada').reduce((acc, curr) => acc + curr.valor, 0);
  const totalExpense = transactions.filter(t => t.tipo === 'saida').reduce((acc, curr) => acc + curr.valor, 0);
  const totalBalance = totalIncome - totalExpense;

  return (
    <div className='flex flex-col items-center font-sans bg-gray-200 min-h-screen'>
      <header className='bg-teal-600 text-white w-full py-14 text-center text-2xl font-bold flex justify-between px-10'>
        Controle Financeiro
        <div className='relative'>
          <button onClick={() => setDropdownOpen(!dropdownOpen)}>
            <FaUserCircle className='text-3xl' />
          </button>
          {dropdownOpen && (
            <div className='absolute right-0 mt-2 w-32 bg-white shadow-md rounded-md'>
              <button onClick={() => navigate('/perfil')} className='block w-full px-4 py-2 text-left hover:bg-gray-100 text-black'>Perfil</button>
              <button onClick={handleLogout} className='block w-full px-4 py-2 text-left text-red-500 hover:bg-gray-100'>Sair</button>
            </div>
          )}
        </div>
      </header>
      
      {/* Cards de resumo */}
      <div className='w-11/12 max-w-4xl grid grid-cols-3 gap-4 -mt-7'>
        <div className='bg-white p-4 rounded-md text-center shadow-md'>
          <p className='text-gray-600'>Entradas</p>
          <p className='text-xl font-bold'>R$ {totalIncome.toFixed(2)}</p>
          <FaArrowUp className='text-green-500 mx-auto mt-2' />
        </div>
        <div className='bg-white p-4 rounded-md text-center shadow-md'>
          <p className='text-gray-600'>Saídas</p>
          <p className='text-xl font-bold'>R$ {totalExpense.toFixed(2)}</p>
          <FaArrowDown className='text-red-500 mx-auto mt-2' />
        </div>
        <div className='bg-white p-4 rounded-md text-center shadow-md'>
          <p className='text-gray-600'>Total</p>
          <p className='text-xl font-bold'>R$ {totalBalance.toFixed(2)}</p>
        </div>
      </div>

      {/* Formulário de transação */}
      <div className='bg-white p-4 mt-6 w-11/12 max-w-4xl rounded-md shadow-md'>
        <div className='flex gap-4'>
          <input type='text' placeholder='Descrição' value={descricao} onChange={(e) => setDescricao(e.target.value)} className='border p-2 flex-1 rounded-md' required/>
          <input type='number' placeholder='Valor' value={valor} onChange={(e) => setValor(e.target.value)} className='border p-2 w-32 rounded-md' required/>
          <div className='flex items-center gap-2'>
            <label>
              <input type='radio' name='type' value='entrada' checked={tipo === 'entrada'} onChange={(e) => setTipo(e.target.value)} required/> Entrada
            </label>
            <label>
              <input type='radio' name='type' value='saida' checked={tipo === 'saida'} onChange={(e) => setTipo(e.target.value)} required/> Saída
            </label>
          </div>
          <button onClick={handleAddTransaction} className='bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600'>Adicionar</button>
        </div>
      </div>

      {/* Lista de transações */}
      <div className='w-11/12 max-w-4xl mt-6'>
        <h2 className='text-2xl font-bold text-teal-600'>Transações</h2>
        <div className='mt-4 bg-white rounded-md shadow-md'>
          <div className='grid grid-cols-3 font-bold p-4 border-b'>
            <p>Descrição</p>
            <p>Valor</p>
            <p>Tipo</p>
          </div>
          {transactions.map((transaction) => (
            <div key={transaction._id} className='grid grid-cols-3 items-center p-4 border-b'>
              <p>{transaction.descricao}</p>
              <p>R$ {transaction.valor.toFixed(2)}</p>
              <div className='flex items-center gap-2'>
                {transaction.tipo === 'entrada' ? <FaArrowUp className='text-green-500' /> : <FaArrowDown className='text-red-500' />}
                <button onClick={() => handleDeleteTransaction(transaction._id)} className='text-red-500 hover:text-red-700'>
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Home;