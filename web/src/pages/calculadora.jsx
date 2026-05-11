import React, { useMemo, useState } from 'react';
import AppMenu from '../components/AppMenu';

function Calculadora() {
  const [valorInicial, setValorInicial] = useState(1000);
  const [aporteMensal, setAporteMensal] = useState(500);
  const [taxaMensal, setTaxaMensal] = useState(1);
  const [meses, setMeses] = useState(60);

  const resultado = useMemo(() => {
    const taxa = Number(taxaMensal) / 100;
    let montante = Number(valorInicial || 0);
    let totalInvestido = Number(valorInicial || 0);

    for (let i = 0; i < Number(meses || 0); i += 1) {
      montante = montante * (1 + taxa) + Number(aporteMensal || 0);
      totalInvestido += Number(aporteMensal || 0);
    }

    return {
      montante,
      totalInvestido,
      juros: montante - totalInvestido,
      rentabilidade: totalInvestido > 0 ? ((montante - totalInvestido) / totalInvestido) * 100 : 0,
    };
  }, [valorInicial, aporteMensal, taxaMensal, meses]);

  const formatMoney = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

  return (
    <main className="app-shell">
      <AppMenu />

      <section className="panel p-5 sm:p-6">
        <h2 className="text-2xl font-extrabold text-slate-900">Calculadora de Juros Compostos</h2>
        <p className="mt-1 text-sm text-slate-500">Simule crescimento de ativos e rentabilidade de longo prazo.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input className="field" type="number" value={valorInicial} onChange={(e) => setValorInicial(e.target.value)} placeholder="Valor inicial" />
          <input className="field" type="number" value={aporteMensal} onChange={(e) => setAporteMensal(e.target.value)} placeholder="Aporte mensal" />
          <input className="field" type="number" step="0.01" value={taxaMensal} onChange={(e) => setTaxaMensal(e.target.value)} placeholder="Taxa mensal (%)" />
          <input className="field" type="number" value={meses} onChange={(e) => setMeses(e.target.value)} placeholder="Periodo (meses)" />
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="kpi-card border-slate-200 bg-white">
          <p className="text-sm font-semibold text-slate-600">Montante final</p>
          <p className="mt-2 text-xl font-extrabold text-slate-900">{formatMoney(resultado.montante)}</p>
        </article>
        <article className="kpi-card border-slate-200 bg-white">
          <p className="text-sm font-semibold text-slate-600">Total investido</p>
          <p className="mt-2 text-xl font-extrabold text-slate-900">{formatMoney(resultado.totalInvestido)}</p>
        </article>
        <article className="kpi-card border-emerald-200 bg-emerald-50">
          <p className="text-sm font-semibold text-emerald-700">Juros acumulados</p>
          <p className="mt-2 text-xl font-extrabold text-emerald-900">{formatMoney(resultado.juros)}</p>
        </article>
        <article className="kpi-card border-sky-200 bg-sky-50">
          <p className="text-sm font-semibold text-sky-700">Rentabilidade</p>
          <p className="mt-2 text-xl font-extrabold text-sky-900">{resultado.rentabilidade.toFixed(2)}%</p>
        </article>
      </section>
    </main>
  );
}

export default Calculadora;