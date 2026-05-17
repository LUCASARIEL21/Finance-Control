import React, { useEffect, useState } from 'react';
import api from '../services/api';
import AppMenu from '../components/AppMenu';
import { useToast } from '../components/ToastProvider';

function ImpostoRenda() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [taxRate, setTaxRate] = useState('15');

  const formatMoney = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/tax/summary?year=${year}`);
        setSummary(response.data);
      } catch (error) {
        toast('Erro ao carregar resumo de IR.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [toast, year]);

  const parsedTaxRate = Math.min(Math.max(Number(taxRate || 0), 0), 100);
  const userEstimatedTax = summary ? (Number(summary.baseCalculo || 0) * parsedTaxRate) / 100 : 0;

  return (
    <main className="app-shell">
      <AppMenu />

      <section className="panel p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Imposto de Renda</h2>
            <p className="text-sm text-slate-500">Resumo anual para apoio na organizacao da declaracao.</p>
          </div>
          <select className="field max-w-[180px]" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {Array.from({ length: 5 }).map((_, idx) => {
              const y = currentYear - idx;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>
      </section>

      {loading ? (
        <section className="panel mt-5 h-40 animate-pulse bg-slate-100" />
      ) : summary ? (
        <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article className="kpi-card border-emerald-200 bg-emerald-50">
            <p className="text-sm font-semibold text-emerald-700">Entradas do ano</p>
            <p className="mt-2 text-xl font-extrabold text-emerald-900">{formatMoney(summary.entradas)}</p>
          </article>
          <article className="kpi-card border-rose-200 bg-rose-50">
            <p className="text-sm font-semibold text-rose-700">Saidas do ano</p>
            <p className="mt-2 text-xl font-extrabold text-rose-900">{formatMoney(summary.saidas)}</p>
          </article>
          <article className="kpi-card border-sky-200 bg-sky-50">
            <p className="text-sm font-semibold text-sky-700">Rendimentos de investimentos</p>
            <p className="mt-2 text-xl font-extrabold text-sky-900">{formatMoney(summary.rendimentos)}</p>
          </article>
          <article className="kpi-card border-amber-200 bg-amber-50">
            <p className="text-sm font-semibold text-amber-700">Base de calculo</p>
            <p className="mt-2 text-xl font-extrabold text-amber-900">{formatMoney(summary.baseCalculo)}</p>
          </article>
          <article className="panel p-4">
            <p className="text-sm font-semibold text-slate-700">Porcentagem de imposto</p>
            <p className="mt-1 text-xs text-slate-500">
              Se você não sabe quanto pagar, pesquise rapidamente a alíquota aplicável ao seu país, ano e faixa de renda.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className="field max-w-[130px]"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
              />
              <span className="text-sm font-semibold text-slate-600">%</span>
            </div>
            <div className="mt-3 rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-3">
              <p className="text-sm font-semibold text-fuchsia-700">Imposto calculado com sua porcentagem</p>
              <p className="mt-1 text-xl font-extrabold text-fuchsia-900">{formatMoney(userEstimatedTax)}</p>
            </div>
          </article>
          <article className="panel p-4 sm:col-span-2 lg:col-span-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Observacao</p>
            <p className="mt-2 text-sm text-slate-600">{summary.observacao}</p>
          </article>
        </section>
      ) : null}
    </main>
  );
}

export default ImpostoRenda;