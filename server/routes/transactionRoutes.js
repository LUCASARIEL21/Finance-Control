const express = require("express");
const { pool } = require("../database/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const mapTransaction = (row) => ({
  _id: row.id,
  id: row.id,
  userId: row.user_id,
  descricao: row.descricao,
  valor: Number(row.valor),
  tipo: row.tipo,
  data: row.data,
});

router.post("/transactions", authMiddleware, async (req, res) => {
  try {
    const { descricao, valor, tipo } = req.body;
    const userId = req.user.id;

    if (!descricao || !valor || !tipo) {
      return res.status(400).json({ mensagem: "Todos os campos são obrigatórios." });
    }

    const result = await pool.query(
      `INSERT INTO transactions (user_id, descricao, valor, tipo, data)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, user_id, descricao, valor, tipo, data`,
      [userId, descricao, valor, tipo]
    );

    res.status(201).json(mapTransaction(result.rows[0]));
  } catch (error) {
    console.error("Erro ao adicionar transação:", error);
    res.status(500).json({ mensagem: "Erro ao adicionar transação." });
  }
});

router.get("/transactions", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, user_id, descricao, valor, tipo, data
       FROM transactions
       WHERE user_id = $1
       ORDER BY data DESC`,
      [req.user.id]
    );

    res.json(result.rows.map(mapTransaction));
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    res.status(500).json({ mensagem: "Erro ao buscar transações." });
  }
});

router.delete("/transactions/:id", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM transactions
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ mensagem: "Transação não encontrada." });
    }

    res.json({ mensagem: "Transação removida com sucesso!" });
  } catch (error) {
    console.error("Erro ao deletar transação:", error);
    res.status(500).json({ mensagem: "Erro ao deletar transação." });
  }
});

module.exports = router;