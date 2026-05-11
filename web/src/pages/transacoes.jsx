import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { FaArrowDown, FaArrowUp, FaTrash } from 'react-icons/fa';
import AppMenu from '../components/AppMenu';
import { useToast } from '../components/ToastProvider';

function Transacoes() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    descricao: '',
    valor: '',
    tipo: 'entrada',
    categoryId: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        const [txResponse, categoryResponse] = await Promise.all([
          api.get('/transactions', { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/categories', { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        setTransactions(txResponse.data);
        setCategories(categoryResponse.data);
      } catch (error) {
        toast('Erro ao carregar transacoes.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, toast]);

  const filteredCategories = useMemo(() => {
    return categories.filter((category) => category.tipo === 'ambos' || category.tipo === form.tipo);
  }, [categories, form.tipo]);

  const totals = useMemo(() => {
    const entradas = transactions
      .filter((transaction) => transaction.tipo === 'entrada')
      .reduce((acc, transaction) => acc + Number(transaction.valor), 0);
    const saidas = transactions
      .filter((transaction) => transaction.tipo === 'saida')
      .reduce((acc, transaction) => acc + Number(transaction.valor), 0);

    return {
      entradas,
      saidas,
      saldo: entradas - saidas,
    };
  }, [transactions]);

  const formatMoney = (value) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value || 0));

  const addTransaction = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/');
      return;
    }

    try {
      const response = await api.post(
        '/transactions',
        {
          descricao: form.descricao,
          valor: Number(form.valor),
          tipo: form.tipo,
          categoryId: form.categoryId || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setTransactions((prev) => [response.data, ...prev]);
      setForm({ descricao: '', valor: '', tipo: 'entrada', categoryId: '' });
      toast('Transacao adicionada.', 'success');
    } catch (error) {
      toast(error.response?.data?.mensagem || 'Erro ao adicionar transacao.', 'error');
    }
  };

  const deleteTransaction = async (id) => {
    const token = localStorage.getItem('token');

    try {
      await api.delete(`/transactions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setTransactions((prev) => prev.filter((item) => (item.id || item._id) !== id));
      toast('Transacao removida.', 'success');
    } catch (error) {
      toast('Erro ao remover transacao.', 'error');
    }
  };

  if (loading) {
    return (
      <main className="app-shell">
        <AppMenu />
        <div className="panel h-40 animate-pulse bg-slate-100" />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <AppMenu />

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="kpi-card border-emerald-200 bg-emerald-50">
          <p className="text-sm font-bold text-emerald-700">Entradas</p>
          <p className="mt-2 text-xl font-extrabold text-emerald-900">{formatMoney(totals.entradas)}</p>
        </article>
        <article className="kpi-card border-rose-200 bg-rose-50">
          <p className="text-sm font-bold text-rose-700">Saidas</p>
          <p className="mt-2 text-xl font-extrabold text-rose-900">{formatMoney(totals.saidas)}</p>
        </article>
        <article className="kpi-card border-sky-200 bg-sky-50">
          <p className="text-sm font-bold text-sky-700">Saldo</p>
          <p className="mt-2 text-xl font-extrabold text-sky-900">{formatMoney(totals.saldo)}</p>
        </article>
      </section>

      <section className="panel mt-5 p-4 sm:p-5">
        <h2 className="text-lg font-extrabold text-slate-900">Nova transacao</h2>
        <form onSubmit={addTransaction} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input className="field sm:col-span-2" placeholder="Descricao" value={form.descricao} onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))} required />
          <input className="field" type="number" placeholder="Valor" value={form.valor} onChange={(e) => setForm((prev) => ({ ...prev, valor: e.target.value }))} required />
          <select className="field" value={form.tipo} onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value, categoryId: '' }))}>
            <option value="entrada">Entrada</option>
            <option value="saida">Saida</option>
          </select>
          <select className="field" value={form.categoryId} onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}>
            <option value="">Sem categoria</option>
            {filteredCategories.map((category) => (
              <option key={category.id} value={category.id}>{category.nome}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary lg:col-start-5">Adicionar</button>
        </form>
      </section>

      <section className="panel mt-5 overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-extrabold text-slate-900">Historico de transacoes</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Descricao</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Categoria</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Valor</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Acao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {transactions.map((transaction) => {
                const id = transaction.id || transaction._id;
                const isEntrada = transaction.tipo === 'entrada';

                return (
                  <tr key={id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">{transaction.descricao}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{transaction.categoryName || 'Sem categoria'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${isEntrada ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {isEntrada ? <FaArrowUp /> : <FaArrowDown />} {isEntrada ? 'Entrada' : 'Saida'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm font-bold ${isEntrada ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatMoney(transaction.valor)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => deleteTransaction(id)} className="inline-flex rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50">
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default Transacoes;