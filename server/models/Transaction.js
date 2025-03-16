const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  descricao: { type: String, required: true },
  valor: { type: Number, required: true },
  tipo: { type: String, enum: ["entrada", "saida"], required: true },
  data: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Transaction", TransactionSchema);
