const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { connectDB } = require("./database/db");
const transactionRoutes = require("./routes/transactionRoutes");
const authRoutes = require("./routes/authRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const reportsRoutes = require("./routes/reportsRoutes");
const investmentsRoutes = require("./routes/investmentsRoutes");
const taxRoutes = require("./routes/taxRoutes");

dotenv.config();

const app = express();
app.use(express.json());

const allowedOrigins = [
  'https://finance-control-dev.netlify.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origem não permitida pelo CORS'));
  },
  credentials: true,
}));

app.use("/api", authRoutes);

app.use("/api", transactionRoutes);
app.use("/api", analyticsRoutes);
app.use("/api", reportsRoutes);
app.use("/api", investmentsRoutes);
app.use("/api", taxRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
};

startServer();
