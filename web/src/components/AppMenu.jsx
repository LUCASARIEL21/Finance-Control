import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const links = [
  { to: '/home', label: 'Home' },
  { to: '/transacoes', label: 'Transacoes' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/relatorios', label: 'Relatorios' },
  { to: '/investimentos', label: 'Investimentos' },
  { to: '/calculadora', label: 'Calculadora' },
  { to: '/imposto-renda', label: 'Imposto de Renda' },
  { to: '/perfil', label: 'Perfil' },
];

function AppMenu() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <header className="panel mb-5 flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Finwise</p>
        <h1 className="text-xl font-extrabold text-slate-900">Controle Financeiro</h1>
      </div>

      <nav className="flex flex-wrap gap-2">
        {links.map((link) => {
          const active = location.pathname === link.to;

          return (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${active ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {link.label}
            </Link>
          );
        })}

        <button type="button" onClick={handleLogout} className="rounded-lg bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-200">
          Sair
        </button>
      </nav>
    </header>
  );
}

export default AppMenu;