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
  categoryId: row.category_id || null,
  categoryName: row.category_name || null,
});

const mapCategory = (row) => ({
  id: row.id,
  nome: row.nome,
  tipo: row.tipo,
});

router.get('/categories', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nome, tipo
       FROM categories
       WHERE user_id = $1
       ORDER BY nome ASC`,
      [req.user.id]
    );

    res.json(result.rows.map(mapCategory));
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar categorias.' });
  }
});

router.post('/categories', authMiddleware, async (req, res) => {
  try {
    const { nome, tipo } = req.body;

    if (!nome || !tipo) {
      return res.status(400).json({ mensagem: 'Nome e tipo da categoria são obrigatórios.' });
    }

    if (!["entrada", "saida", "ambos"].includes(tipo)) {
      return res.status(400).json({ mensagem: 'Tipo de categoria inválido.' });
    }

    const result = await pool.query(
      `INSERT INTO categories (user_id, nome, tipo)
       VALUES ($1, $2, $3)
       RETURNING id, nome, tipo`,
      [req.user.id, nome.trim(), tipo]
    );

    res.status(201).json(mapCategory(result.rows[0]));
  } catch (error) {
    console.error('Erro ao criar categoria:', error);

    if (error.code === '23505') {
      return res.status(409).json({ mensagem: 'Categoria já cadastrada para este usuário.' });
    }

    res.status(500).json({ mensagem: 'Erro ao criar categoria.' });
  }
});

router.post("/transactions", authMiddleware, async (req, res) => {
  try {
    const { descricao, valor, tipo, categoryId } = req.body;
    const userId = req.user.id;

    if (!descricao || !valor || !tipo) {
      return res.status(400).json({ mensagem: "Todos os campos são obrigatórios." });
    }

    if (categoryId) {
      const categoryCheck = await pool.query(
        `SELECT id
         FROM categories
         WHERE id = $1 AND user_id = $2`,
        [categoryId, userId]
      );

      if (categoryCheck.rowCount === 0) {
        return res.status(404).json({ mensagem: 'Categoria não encontrada.' });
      }
    }

    const result = await pool.query(
      `INSERT INTO transactions (user_id, descricao, valor, tipo, data, category_id)
       VALUES ($1, $2, $3, $4, NOW(), $5)
       RETURNING id, user_id, descricao, valor, tipo, data, category_id`,
      [userId, descricao, valor, tipo, categoryId || null]
    );

    const categoryName = categoryId
      ? (await pool.query('SELECT nome FROM categories WHERE id = $1', [categoryId])).rows[0]?.nome || null
      : null;

    res.status(201).json(mapTransaction({ ...result.rows[0], category_name: categoryName }));
  } catch (error) {
    console.error("Erro ao adicionar transação:", error);
    res.status(500).json({ mensagem: "Erro ao adicionar transação." });
  }
});

router.get("/transactions", authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filters = [req.user.id];
    let where = 't.user_id = $1';

    if (startDate) {
      filters.push(startDate);
      where += ` AND t.data >= $${filters.length}`;
    }

    if (endDate) {
      filters.push(endDate);
      where += ` AND t.data <= $${filters.length}::date + INTERVAL '1 day' - INTERVAL '1 second'`;
    }

    const result = await pool.query(
      `SELECT t.id, t.user_id, t.descricao, t.valor, t.tipo, t.data, t.category_id, c.nome AS category_name
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE ${where}
       ORDER BY t.data DESC`,
      filters
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