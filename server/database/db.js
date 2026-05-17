const { Pool } = require("pg");
require("dotenv").config();

const sslEnabled = process.env.PGSSL === "true";
const sslRejectUnauthorized = process.env.PGSSL_REJECT_UNAUTHORIZED !== "false";
const sslCa = process.env.PGSSL_CA ? process.env.PGSSL_CA.replace(/\\n/g, "\n") : undefined;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslEnabled
    ? {
        rejectUnauthorized: sslRejectUnauthorized,
        ...(sslCa ? { ca: sslCa } : {}),
      }
    : undefined,
});

const connectDB = async () => {
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL conectado com sucesso!");
  } catch (error) {
    console.error("Erro ao conectar ao PostgreSQL:", error);
    process.exit(1);
  }
};

module.exports = {
  pool,
  connectDB,
};