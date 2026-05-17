import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';
import api from '../services/api';

const links = [
  { to: '/home', label: 'Home' },
  { to: '/transacoes', label: 'Transacoes' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/relatorios', label: 'Relatorios' },
  { to: '/investimentos', label: 'Investimentos' },
  { to: '/calculadora', label: 'Juros Compostos' },
  { to: '/imposto-renda', label: 'Imposto de Renda' },
  { to: '/perfil', label: 'Perfil' },
];

function AppMenu() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch (_) {
      // ignore
    }
    setMobileOpen(false);
    navigate('/');
  };

  const handleNavigate = () => {
    setMobileOpen(false);
  };

  return (
    <header className="panel mb-5 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Finwise</p>
          <h1 className="text-xl font-extrabold text-slate-900">Controle Financeiro</h1>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden"
          aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          {mobileOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      <nav className={`mt-3 flex-col gap-2 ${mobileOpen ? 'flex' : 'hidden'} md:mt-4 md:flex md:flex-row md:flex-wrap`}>
        {links.map((link) => {
          const active = location.pathname === link.to;

          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={handleNavigate}
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