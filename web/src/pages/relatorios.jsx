import React, { useMemo, useState } from 'react';
import api from '../services/api';
import AppMenu from '../components/AppMenu';
import { useToast } from '../components/ToastProvider';

function Relatorios() {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');

  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/categories');
        setCategories(response.data || []);
      } catch (error) {
        toast('Erro ao carregar categorias dos relatorios.', 'error');
      }
    };

    fetchCategories();
  }, [toast]);

  const canExport = useMemo(() => Boolean(startDate && endDate && startDate <= endDate), [startDate, endDate]);

  const exportFile = async (format) => {
    if (!canExport) {
      toast('Informe um periodo valido para exportacao.', 'error');
      return;
    }

    try {
      const endpoint = format === 'excel' ? '/reports/export/excel' : '/reports/export/pdf';
      const query = new URLSearchParams({
        startDate,
        endDate,
      });

      if (categoryId) {
        query.set('categoryId', categoryId);
      }

      const response = await api.get(`${endpoint}?${query.toString()}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = format === 'excel' ? `relatorio_${startDate}_${endDate}.xlsx` : `relatorio_${startDate}_${endDate}.pdf`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      toast(`Relatorio ${format.toUpperCase()} exportado com sucesso.`, 'success');
    } catch (error) {
      toast('Erro ao exportar relatorio.', 'error');
    }
  };

  return (
    <main className="app-shell">
      <AppMenu />

      <section className="panel p-5 sm:p-6">
        <h2 className="text-2xl font-extrabold text-slate-900">Exportacao de relatorios</h2>
        <p className="mt-1 text-sm text-slate-500">Selecione o periodo financeiro para exportar em Excel ou PDF.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input type="date" className="field" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" className="field" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <select className="field sm:col-span-2" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.nome}</option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button className="btn-primary" disabled={!canExport} type="button" onClick={() => exportFile('excel')}>
            Exportar Excel
          </button>
          <button className="btn-ghost" disabled={!canExport} type="button" onClick={() => exportFile('pdf')}>
            Exportar PDF
          </button>
        </div>
      </section>
    </main>
  );
}

export default Relatorios;