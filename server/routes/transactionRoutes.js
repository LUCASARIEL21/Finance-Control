const express = require("express");
const Transaction = require("../models/Transaction");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/transactions", authMiddleware, async (req, res) => {
  try {
    const { descricao, valor, tipo } = req.body;
    const userId = req.user.id;

    if (!descricao || !valor || !tipo) {
      return res.status(400).json({ mensagem: "Todos os campos são obrigatórios." });
    }

    const transaction = new Transaction({
      userId,
      descricao,
      valor,
      tipo,
      data: new Date(),
    });

    await transaction.save();
    res.status(201).json(transaction);
  } catch (error) {
    console.error("Erro ao adicionar transação:", error);
    res.status(500).json({ mensagem: "Erro ao adicionar transação." });
  }
});

router.get("/transactions", authMiddleware, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ data: -1 });
    res.json(transactions);
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    res.status(500).json({ mensagem: "Erro ao buscar transações." });
  }
});

router.delete("/transactions/:id", authMiddleware, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user.id });

    if (!transaction) {
      return res.status(404).json({ mensagem: "Transação não encontrada." });
    }

    res.json({ mensagem: "Transação removida com sucesso!" });
  } catch (error) {
    console.error("Erro ao deletar transação:", error);
    res.status(500).json({ mensagem: "Erro ao deletar transação." });
  }
});

module.exports = router;