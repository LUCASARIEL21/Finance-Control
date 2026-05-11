const express = require('express');
const { pool } = require('../database/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/tax/summary', authMiddleware, async (req, res) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear());

    const txTotals = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN valor END), 0) AS total_entradas,
         COALESCE(SUM(CASE WHEN tipo = 'saida' THEN valor END), 0) AS total_saidas
       FROM transactions
       WHERE user_id = $1
         AND EXTRACT(YEAR FROM data) = $2`,
      [req.user.id, year]
    );

    const investmentTotals = await pool.query(
      `SELECT COALESCE(SUM(CASE WHEN tipo = 'rendimento' THEN valor END), 0) AS total_rendimentos
       FROM investment_movements
       WHERE user_id = $1
         AND EXTRACT(YEAR FROM data) = $2`,
      [req.user.id, year]
    );

    const entradas = Number(txTotals.rows[0].total_entradas);
    const saidas = Number(txTotals.rows[0].total_saidas);
    const rendimentos = Number(investmentTotals.rows[0].total_rendimentos);

    const baseCalculo = Math.max(entradas + rendimentos - saidas, 0);
    const impostoEstimado = baseCalculo * 0.15;

    res.json({
      ano: year,
      entradas,
      saidas,
      rendimentos,
      baseCalculo,
      impostoEstimado,
      observacao: 'Resumo estimado para apoio. A apuração oficial deve seguir as regras da Receita Federal.',
    });
  } catch (error) {
    console.error('Erro ao gerar resumo de imposto de renda:', error);
    res.status(500).json({ mensagem: 'Erro ao gerar resumo de imposto de renda.' });
  }
});

module.exports = router;