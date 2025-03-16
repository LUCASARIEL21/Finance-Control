const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./database/db");
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require("./routes/transactionRoutes");

dotenv.config();
connectDB();

const app = express();
app.use(express.json());

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true 
  }));

app.use('/api', authRoutes);
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/login", require("./routes/authRoutes"));
app.use("/api/perfil", require("./routes/authRoutes"));
app.use("/api/trocar-senha", require("./routes/authRoutes"));

app.use("/api", transactionRoutes);
app.use("/api/transactions", require("./routes/transactionRoutes"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
