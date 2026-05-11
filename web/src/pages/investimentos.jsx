import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import AppMenu from '../components/AppMenu';
import { useToast } from '../components/ToastProvider';
import { FaTrash } from 'react-icons/fa';

function Investimentos() {
  const { toast } = useToast();

  const [assets, setAssets] = useState([]);
  const [summary, setSummary] = useState({ valorInvestido: 0, valorPatrimonial: 0, lucroPrejuizo: 0, rentabilidadePercentual: 0 });
  const [form, setForm] = useState({
    tipo: 'acao',
    nome: '',
    ticker: '',
    quantidade: '',
    precoMedio: '',
    valorAtual: '',
    dataAquisicao: '',
  });

  const formatMoney = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

  const rentabilidadeClass = useMemo(() => {
    if (summary.rentabilidadePercentual > 0) return 'text-emerald-700';
    if (summary.rentabilidadePercentual < 0) return 'text-rose-700';
    return 'text-slate-700';
  }, [summary.rentabilidadePercentual]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [assetsResponse, summaryResponse] = await Promise.all([
        api.get('/investments/assets', { headers: { Authorization: `Bearer ${token}` } }),
        api.get('/investments/summary', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      setAssets(assetsResponse.data);
      setSummary(summaryResponse.data);
    } catch (error) {
      toast('Erro ao carregar investimentos.', 'error');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addAsset = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      await api.post('/investments/assets', {
        ...form,
        quantidade: Number(form.quantidade || 0),
        precoMedio: Number(form.precoMedio || 0),
        valorAtual: Number(form.valorAtual || 0),
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setForm({
        tipo: 'acao',
        nome: '',
        ticker: '',
        quantidade: '',
        precoMedio: '',
        valorAtual: '',
        dataAquisicao: '',
      });
      toast('Ativo cadastrado com sucesso.', 'success');
      fetchData();
    } catch (error) {
      toast(error.response?.data?.mensagem || 'Erro ao cadastrar ativo.', 'error');
    }
  };

  const deleteAsset = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await api.delete(`/investments/assets/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast('Ativo removido.', 'success');
      fetchData();
    } catch (error) {
      toast('Erro ao remover ativo.', 'error');
    }
  };

  return (
    <main className="app-shell">
      <AppMenu />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="kpi-card border-slate-200 bg-white">
          <p className="text-sm font-semibold text-slate-600">Valor Investido</p>
          <p className="mt-1 text-xl font-extrabold text-slate-900">{formatMoney(summary.valorInvestido)}</p>
        </article>
        <article className="kpi-card border-slate-200 bg-white">
          <p className="text-sm font-semibold text-slate-600">Patrimonio</p>
          <p className="mt-1 text-xl font-extrabold text-slate-900">{formatMoney(summary.valorPatrimonial)}</p>
        </article>
        <article className="kpi-card border-slate-200 bg-white">
          <p className="text-sm font-semibold text-slate-600">Lucro/Prejuizo</p>
          <p className={`mt-1 text-xl font-extrabold ${summary.lucroPrejuizo >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatMoney(summary.lucroPrejuizo)}</p>
        </article>
        <article className="kpi-card border-slate-200 bg-white">
          <p className="text-sm font-semibold text-slate-600">Rentabilidade</p>
          <p className={`mt-1 text-xl font-extrabold ${rentabilidadeClass}`}>{Number(summary.rentabilidadePercentual || 0).toFixed(2)}%</p>
        </article>
      </section>

      <section className="panel mt-5 p-4 sm:p-5">
        <h2 className="text-lg font-extrabold text-slate-900">Novo ativo</h2>
        <form onSubmit={addAsset} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select className="field" value={form.tipo} onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value }))}>
            <option value="acao">Acao</option>
            <option value="fii">FII</option>
            <option value="etf">ETF</option>
            <option value="renda_fixa">Renda Fixa</option>
            <option value="cripto">Cripto</option>
          </select>
          <input className="field" placeholder="Nome" value={form.nome} onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))} required />
          <input className="field" placeholder="Ticker" value={form.ticker} onChange={(e) => setForm((prev) => ({ ...prev, ticker: e.target.value }))} />
          <input className="field" placeholder="Quantidade" type="number" value={form.quantidade} onChange={(e) => setForm((prev) => ({ ...prev, quantidade: e.target.value }))} />
          <input className="field" placeholder="Preco medio" type="number" value={form.precoMedio} onChange={(e) => setForm((prev) => ({ ...prev, precoMedio: e.target.value }))} />
          <input className="field" placeholder="Valor atual" type="number" value={form.valorAtual} onChange={(e) => setForm((prev) => ({ ...prev, valorAtual: e.target.value }))} />
          <input className="field" placeholder="Data aquisicao" type="date" value={form.dataAquisicao} onChange={(e) => setForm((prev) => ({ ...prev, dataAquisicao: e.target.value }))} />
          <button className="btn-primary">Salvar ativo</button>
        </form>
      </section>

      <section className="panel mt-5 overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-extrabold text-slate-900">Carteira de ativos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Ativo</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Investido</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Patrimonio</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Acao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700">{asset.nome} {asset.ticker ? `(${asset.ticker})` : ''}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{asset.tipo}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700">{formatMoney(asset.valorInvestido)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-700">{formatMoney(asset.valorPatrimonial)}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="inline-flex rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50" type="button" onClick={() => deleteAsset(asset.id)}>
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default Investimentos;