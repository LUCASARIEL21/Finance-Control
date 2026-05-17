import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import AppMenu from '../components/AppMenu';
import { useToast } from '../components/ToastProvider';

const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function Dashboard() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(currentYear);
  const [monthly, setMonthly] = useState([]);
  const [summary, setSummary] = useState({ entradas: 0, saidas: 0, saldo: 0, topCategoriasSaida: [] });
  const [loading, setLoading] = useState(true);

  const [monthStart, setMonthStart] = useState(1);
  const [monthEnd, setMonthEnd] = useState(12);
  const [metric, setMetric] = useState('saldo');
  const [selectedMonth, setSelectedMonth] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [monthlyResponse, summaryResponse] = await Promise.all([
          api.get(`/analytics/monthly?year=${year}`),
          api.get(`/analytics/dashboard?year=${year}`),
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
  }, [toast, year]);

  useEffect(() => {
    if (monthStart > monthEnd) {
      setMonthEnd(monthStart);
    }
  }, [monthStart, monthEnd]);

  const formatMoney = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

  const filteredMonthly = useMemo(
    () => monthly.filter((item) => item.month >= monthStart && item.month <= monthEnd),
    [monthly, monthStart, monthEnd]
  );

  const scopedSummary = useMemo(() => {
    const entradas = filteredMonthly.reduce((acc, item) => acc + Number(item.entradas || 0), 0);
    const saidas = filteredMonthly.reduce((acc, item) => acc + Number(item.saidas || 0), 0);
    return { entradas, saidas, saldo: entradas - saidas };
  }, [filteredMonthly]);

  const series = useMemo(() => {
    const values = filteredMonthly.map((item) => {
      if (metric === 'entradas') return Number(item.entradas || 0);
      if (metric === 'saidas') return Number(item.saidas || 0);
      return Number(item.saldo || 0);
    });

    const maxAbs = Math.max(...values.map((value) => Math.abs(value)), 1);

    return filteredMonthly.map((item, index) => ({
      ...item,
      metricValue: values[index],
      x: filteredMonthly.length <= 1 ? 30 : 30 + (index * 740) / (filteredMonthly.length - 1),
      y: 150 - (values[index] / maxAbs) * 110,
    }));
  }, [filteredMonthly, metric]);

  const linePath = useMemo(() => {
    if (!series.length) return '';
    return series
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(' ');
  }, [series]);

  const activePoint = useMemo(() => {
    if (!series.length) return null;
    if (selectedMonth) {
      const byMonth = series.find((item) => item.month === selectedMonth);
      if (byMonth) return byMonth;
    }
    return series[series.length - 1];
  }, [series, selectedMonth]);

  const chartAccentClass = metric === 'entradas' ? 'text-emerald-700' : metric === 'saidas' ? 'text-rose-700' : 'text-sky-700';

  return (
    <main className="app-shell">
      <AppMenu />

      <section className="panel p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Dashboard Financeiro Interativo</h2>
            <p className="text-sm text-slate-500">Explore seu desempenho por período, métrica e comportamento mensal.</p>
          </div>

          <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-4">
            <select className="field min-w-[130px]" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {Array.from({ length: 5 }).map((_, index) => {
                const y = currentYear - index;
                return (
                  <option key={y} value={y}>{y}</option>
                );
              })}
            </select>

            <select className="field min-w-[130px]" value={monthStart} onChange={(e) => setMonthStart(Number(e.target.value))}>
              {monthLabels.map((label, index) => (
                <option key={`start-${label}`} value={index + 1}>De {label}</option>
              ))}
            </select>

            <select className="field min-w-[130px]" value={monthEnd} onChange={(e) => setMonthEnd(Number(e.target.value))}>
              {monthLabels.map((label, index) => (
                <option key={`end-${label}`} value={index + 1}>Ate {label}</option>
              ))}
            </select>

            <select className="field min-w-[150px]" value={metric} onChange={(e) => setMetric(e.target.value)}>
              <option value="saldo">Metrica: Saldo</option>
              <option value="entradas">Metrica: Entradas</option>
              <option value="saidas">Metrica: Saidas</option>
            </select>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-3">
        <article className="kpi-card border-emerald-200 bg-emerald-50">
          <p className="text-sm font-bold text-emerald-700">Entradas ({year})</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-900">{formatMoney(scopedSummary.entradas)}</p>
        </article>
        <article className="kpi-card border-rose-200 bg-rose-50">
          <p className="text-sm font-bold text-rose-700">Saidas ({year})</p>
          <p className="mt-2 text-2xl font-extrabold text-rose-900">{formatMoney(scopedSummary.saidas)}</p>
        </article>
        <article className="kpi-card border-sky-200 bg-sky-50">
          <p className="text-sm font-bold text-sky-700">Saldo ({year})</p>
          <p className="mt-2 text-2xl font-extrabold text-sky-900">{formatMoney(scopedSummary.saldo)}</p>
        </article>
      </section>

      <section className="panel mt-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-extrabold text-slate-900">Grafico de evolucao ({monthLabels[monthStart - 1]} - {monthLabels[monthEnd - 1]})</h3>
          {activePoint ? (
            <p className={`text-sm font-bold ${chartAccentClass}`}>
              {monthLabels[activePoint.month - 1]}: {formatMoney(activePoint.metricValue)}
            </p>
          ) : null}
        </div>

        {loading ? (
          <div className="mt-4 h-52 animate-pulse rounded-xl bg-slate-100" />
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3">
            <svg viewBox="0 0 800 220" className="h-[240px] w-full min-w-[720px]">
              <line x1="30" y1="150" x2="770" y2="150" stroke="#e2e8f0" strokeWidth="2" />
              <line x1="30" y1="30" x2="30" y2="190" stroke="#e2e8f0" strokeWidth="2" />

              {linePath ? <path d={linePath} fill="none" stroke="#0f766e" strokeWidth="3" /> : null}

              {series.map((point) => (
                <g key={`p-${point.month}`} onMouseEnter={() => setSelectedMonth(point.month)} className="cursor-pointer">
                  <circle cx={point.x} cy={point.y} r="5" fill="#0f766e" />
                  <text x={point.x} y="205" textAnchor="middle" fontSize="11" fill="#64748b">
                    {monthLabels[point.month - 1]}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        )}

        {!loading ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {series.map((item) => (
              <button
                key={`bar-${item.month}`}
                type="button"
                onClick={() => setSelectedMonth(item.month)}
                className={`rounded-xl border px-3 py-2 text-left transition ${selectedMonth === item.month ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{monthLabels[item.month - 1]}</p>
                <p className={`mt-1 text-sm font-extrabold ${chartAccentClass}`}>{formatMoney(item.metricValue)}</p>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="panel mt-5 p-4 sm:p-5">
        <h3 className="text-lg font-extrabold text-slate-900">Top categorias de saida ({year})</h3>
        <div className="mt-3 space-y-2">
          {(summary.topCategoriasSaida || []).length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma categoria de saida encontrada para o ano selecionado.</p>
          ) : (
            summary.topCategoriasSaida.map((item) => {
              const maxValue = Math.max(...summary.topCategoriasSaida.map((row) => Number(row.total || 0)), 1);
              const width = Math.max((Number(item.total || 0) / maxValue) * 100, 6);

              return (
                <div key={item.categoria} className="rounded-lg border border-slate-200 px-3 py-2">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                    <span>{item.categoria}</span>
                    <span className="font-bold text-rose-700">{formatMoney(item.total)}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-rose-500" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}

export default Dashboard;
