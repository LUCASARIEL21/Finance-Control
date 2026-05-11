const express = require('express');
const { pool } = require('../database/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/analytics/monthly', authMiddleware, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 4;
    const selectedYear = Number(req.query.year || currentYear);

    if (Number.isNaN(selectedYear) || selectedYear < minYear || selectedYear > currentYear) {
      return res.status(400).json({
        mensagem: `Ano inválido. Informe um ano entre ${minYear} e ${currentYear}.`,
      });
    }

    const result = await pool.query(
      `WITH months AS (
         SELECT generate_series(1, 12) AS month
       )
       SELECT
         m.month,
         COALESCE(SUM(CASE WHEN t.tipo = 'entrada' THEN t.valor END), 0) AS entradas,
         COALESCE(SUM(CASE WHEN t.tipo = 'saida' THEN t.valor END), 0) AS saidas
       FROM months m
       LEFT JOIN transactions t
         ON EXTRACT(MONTH FROM t.data) = m.month
        AND EXTRACT(YEAR FROM t.data) = $2
        AND t.user_id = $1
       GROUP BY m.month
       ORDER BY m.month`,
      [req.user.id, selectedYear]
    );

    res.json({
      year: selectedYear,
      minYear,
      maxYear: currentYear,
      data: result.rows.map((row) => ({
        month: Number(row.month),
        entradas: Number(row.entradas),
        saidas: Number(row.saidas),
        saldo: Number(row.entradas) - Number(row.saidas),
      })),
    });
  } catch (error) {
    console.error('Erro ao gerar acompanhamento mensal:', error);
    res.status(500).json({ mensagem: 'Erro ao gerar acompanhamento mensal.' });
  }
});

router.get('/analytics/dashboard', authMiddleware, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const year = Number(req.query.year || currentYear);

    const totals = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor END), 0) AS entradas,
         COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor END), 0) AS saidas
       FROM transactions
       WHERE user_id = $1
         AND EXTRACT(YEAR FROM data) = $2`,
      [req.user.id, year]
    );

    const categories = await pool.query(
      `SELECT COALESCE(c.nome, 'Sem categoria') AS categoria,
              COALESCE(SUM(t.valor), 0) AS total
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = $1
         AND t.tipo = 'saida'
         AND EXTRACT(YEAR FROM t.data) = $2
       GROUP BY COALESCE(c.nome, 'Sem categoria')
       ORDER BY total DESC
       LIMIT 5`,
      [req.user.id, year]
    );

    res.json({
      year,
      entradas: Number(totals.rows[0].entradas),
      saidas: Number(totals.rows[0].saidas),
      saldo: Number(totals.rows[0].entradas) - Number(totals.rows[0].saidas),
      topCategoriasSaida: categories.rows.map((row) => ({
        categoria: row.categoria,
        total: Number(row.total),
      })),
    });
  } catch (error) {
    console.error('Erro ao gerar dashboard financeiro:', error);
    res.status(500).json({ mensagem: 'Erro ao gerar dashboard financeiro.' });
  }
});

module.exports = router;