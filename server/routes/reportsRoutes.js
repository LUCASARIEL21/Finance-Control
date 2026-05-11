const express = require('express');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { pool } = require('../database/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const fetchTransactionsByRange = async (userId, startDate, endDate) => {
  const result = await pool.query(
    `SELECT t.data, t.descricao, t.tipo, t.valor, COALESCE(c.nome, 'Sem categoria') AS categoria
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = $1
       AND t.data >= $2::date
       AND t.data <= $3::date + INTERVAL '1 day' - INTERVAL '1 second'
     ORDER BY t.data ASC`,
    [userId, startDate, endDate]
  );

  return result.rows;
};

router.get('/reports/export/excel', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ mensagem: 'startDate e endDate são obrigatórios.' });
    }

    const rows = await fetchTransactionsByRange(req.user.id, startDate, endDate);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Relatorio');

    sheet.columns = [
      { header: 'Data', key: 'data', width: 16 },
      { header: 'Descricao', key: 'descricao', width: 40 },
      { header: 'Categoria', key: 'categoria', width: 24 },
      { header: 'Tipo', key: 'tipo', width: 14 },
      { header: 'Valor', key: 'valor', width: 16 },
    ];

    rows.forEach((row) => {
      sheet.addRow({
        data: new Date(row.data).toLocaleDateString('pt-BR'),
        descricao: row.descricao,
        categoria: row.categoria,
        tipo: row.tipo,
        valor: Number(row.valor),
      });
    });

    const totalEntradas = rows
      .filter((row) => row.tipo === 'entrada')
      .reduce((acc, row) => acc + Number(row.valor), 0);
    const totalSaidas = rows
      .filter((row) => row.tipo === 'saida')
      .reduce((acc, row) => acc + Number(row.valor), 0);

    sheet.addRow({});
    sheet.addRow({ descricao: 'Total de Entradas', valor: totalEntradas });
    sheet.addRow({ descricao: 'Total de Saidas', valor: totalSaidas });
    sheet.addRow({ descricao: 'Saldo', valor: totalEntradas - totalSaidas });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=relatorio_${startDate}_${endDate}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Erro ao exportar excel:', error);
    res.status(500).json({ mensagem: 'Erro ao exportar Excel.' });
  }
});

router.get('/reports/export/pdf', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ mensagem: 'startDate e endDate são obrigatórios.' });
    }

    const rows = await fetchTransactionsByRange(req.user.id, startDate, endDate);
    const totalEntradas = rows
      .filter((row) => row.tipo === 'entrada')
      .reduce((acc, row) => acc + Number(row.valor), 0);
    const totalSaidas = rows
      .filter((row) => row.tipo === 'saida')
      .reduce((acc, row) => acc + Number(row.valor), 0);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=relatorio_${startDate}_${endDate}.pdf`);

    const doc = new PDFDocument({ margin: 36, size: 'A4' });
    doc.pipe(res);

    doc.fontSize(16).text('Relatorio Financeiro', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(10).text(`Periodo: ${startDate} ate ${endDate}`);
    doc.moveDown();

    rows.forEach((row) => {
      const line = `${new Date(row.data).toLocaleDateString('pt-BR')} | ${row.descricao} | ${row.categoria} | ${row.tipo} | R$ ${Number(row.valor).toFixed(2)}`;
      doc.fontSize(9).text(line);
    });

    doc.moveDown();
    doc.fontSize(10).text(`Total Entradas: R$ ${totalEntradas.toFixed(2)}`);
    doc.text(`Total Saidas: R$ ${totalSaidas.toFixed(2)}`);
    doc.text(`Saldo: R$ ${(totalEntradas - totalSaidas).toFixed(2)}`);

    doc.end();
  } catch (error) {
    console.error('Erro ao exportar pdf:', error);
    res.status(500).json({ mensagem: 'Erro ao exportar PDF.' });
  }
});

module.exports = router;