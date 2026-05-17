import React from 'react';
import { Link } from 'react-router-dom';
import AppMenu from '../components/AppMenu';

const features = [
  {
    title: 'Transacoes',
    description: 'Registre entradas e saidas com categorias e acompanhe seu saldo atual.',
    to: '/transacoes',
  },
  {
    title: 'Dashboard',
    description: 'Visualize historico mensal, top categorias de gastos e evolucao financeira.',
    to: '/dashboard',
  },
  {
    title: 'Relatorios',
    description: 'Exporte seu periodo financeiro em Excel e PDF para analise e controle.',
    to: '/relatorios',
  },
  {
    title: 'Investimentos',
    description: 'Cadastre ativos, acompanhe patrimonio e rentabilidade da carteira.',
    to: '/investimentos',
  },
  {
    title: 'Juros Compostos',
    description: 'Simule juros compostos e calcule rentabilidade de possiveis ativos.',
    to: '/calculadora',
  },
  {
    title: 'Imposto de Renda',
    description: 'Acompanhe resumo anual para apoio na organizacao do IR.',
    to: '/imposto-renda',
  },
];

function Home() {
  return (
    <main className="app-shell">
      <AppMenu />

      <section className="panel bg-gradient-to-r from-teal-700 to-cyan-600 p-6 text-white sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">Portal Principal</p>
        <h2 className="mt-2 text-3xl font-extrabold">Bem-vindo ao Finwise</h2>
        <p className="mt-2 max-w-2xl text-sm text-teal-50">
          Este sistema foi pensado para concentrar seu controle financeiro pessoal: transacoes,
          analytics, exportacoes, investimentos, simulacoes e apoio no imposto de renda.
        </p>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <article key={feature.to} className="panel p-5">
            <h3 className="text-lg font-extrabold text-slate-900">{feature.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
            <Link to={feature.to} className="btn-primary mt-4 inline-block">
              Acessar {feature.title}
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}

export default Home;
