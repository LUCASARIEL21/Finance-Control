import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import AppMenu from '../components/AppMenu';
import { useToast } from '../components/ToastProvider';

const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 4;

  const [year, setYear] = useState(currentYear);
  const [monthly, setMonthly] = useState([]);
  const [summary, setSummary] = useState({ entradas: 0, saidas: 0, saldo: 0, topCategoriasSaida: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [monthlyResponse, summaryResponse] = await Promise.all([
          api.get(`/analytics/monthly?year=${year}`, { headers: { Authorization: `Bearer ${token}` } }),
          api.get(`/analytics/dashboard?year=${year}`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        setMonthly(monthlyResponse.data.data || []);
        setSummary(summaryResponse.data);
      } catch (error) {
        toast('Erro ao carregar dashboard.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, toast, year]);

  const maxValue = useMemo(() => {
    const values = monthly.flatMap((item) => [item.entradas, item.saidas]);
    return Math.max(...values, 1);
  }, [monthly]);

  const formatMoney = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

  return (
    <main className="app-shell">
      <AppMenu />

      <section className="panel flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Dashboard Financeiro</h2>
          <p className="text-sm text-slate-500">Acompanhamento mensal de entradas e saidas dos ultimos 5 anos.</p>
        </div>

        <select className="field max-w-[180px]" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {Array.from({ length: 5 }).map((_, index) => {
            const y = currentYear - index;
            return (
              <option key={y} value={y}>{y}</option>
            );
          })}
        </select>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-3">
        <article className="kpi-card border-emerald-200 bg-emerald-50">
          <p className="text-sm font-bold text-emerald-700">Entradas ({year})</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-900">{formatMoney(summary.entradas)}</p>
        </article>
        <article className="kpi-card border-rose-200 bg-rose-50">
          <p className="text-sm font-bold text-rose-700">Saidas ({year})</p>
          <p className="mt-2 text-2xl font-extrabold text-rose-900">{formatMoney(summary.saidas)}</p>
        </article>
        <article className="kpi-card border-sky-200 bg-sky-50">
          <p className="text-sm font-bold text-sky-700">Saldo ({year})</p>
          <p className="mt-2 text-2xl font-extrabold text-sky-900">{formatMoney(summary.saldo)}</p>
        </article>
      </section>

      <section className="panel mt-5 p-4 sm:p-5">
        <h3 className="text-lg font-extrabold text-slate-900">Evolucao mensal</h3>
        {loading ? (
          <div className="mt-4 h-40 animate-pulse rounded-xl bg-slate-100" />
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {monthly.map((item) => (
              <article key={item.month} className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{monthLabels[item.month - 1]}</p>
                <div className="mt-2 space-y-2">
                  <div>
                    <p className="text-xs text-slate-500">Entradas</p>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.max((item.entradas / maxValue) * 100, 2)}%` }} />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-emerald-700">{formatMoney(item.entradas)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Saidas</p>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-rose-500" style={{ width: `${Math.max((item.saidas / maxValue) * 100, 2)}%` }} />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-rose-700">{formatMoney(item.saidas)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel mt-5 p-4 sm:p-5">
        <h3 className="text-lg font-extrabold text-slate-900">Top categorias de saida ({year})</h3>
        <div className="mt-3 space-y-2">
          {(summary.topCategoriasSaida || []).length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma categoria de saida encontrada para o ano selecionado.</p>
          ) : (
            summary.topCategoriasSaida.map((item) => (
              <div key={item.categoria} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm font-semibold text-slate-700">{item.categoria}</span>
                <span className="text-sm font-bold text-rose-700">{formatMoney(item.total)}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

export default Dashboard;