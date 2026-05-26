const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const transactionRoutes = require("./routes/transactionRoutes");
const authRoutes = require("./routes/authRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const reportsRoutes = require("./routes/reportsRoutes");
const investmentsRoutes = require("./routes/investmentsRoutes");
const taxRoutes = require("./routes/taxRoutes");
const assistantRoutes = require("./routes/assistantRoutes");

dotenv.config();

const app = express();
app.disable("x-powered-by");
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);
app.use(express.json({ limit: "200kb" }));
app.use(cookieParser());

const envOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowVercelPreviews = process.env.CORS_ALLOW_VERCEL_PREVIEWS !== "false";
const vercelProjectPrefix = (
  process.env.CORS_VERCEL_PROJECT_PREFIX || "finance-control-"
).toLowerCase();

function isAllowedVercelPreview(origin) {
  if (!allowVercelPreviews || !origin) {
    return false;
  }

  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();
    return (
      parsed.protocol === "https:" &&
      hostname.endsWith(".vercel.app") &&
      hostname.startsWith(vercelProjectPrefix)
    );
  } catch {
    return false;
  }
}

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://finance-control-dev.netlify.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...envOrigins,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        isAllowedVercelPreview(origin)
      ) {
        return callback(null, true);
      }

      return callback(new Error("Origem nao permitida pelo CORS"));
    },
    credentials: true,
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    mensagem: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  },
});

const reportsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    mensagem:
      "Limite de exportacoes temporariamente atingido. Tente novamente em alguns minutos.",
  },
});

app.use("/api/login", authLimiter);
app.use("/api/register", authLimiter);
app.use("/api/trocar-senha", authLimiter);
app.use("/api/reports/export", reportsLimiter);

app.use("/api", authRoutes);
app.use("/api", transactionRoutes);
app.use("/api", analyticsRoutes);
app.use("/api", reportsRoutes);
app.use("/api", investmentsRoutes);
app.use("/api", taxRoutes);
app.use("/api", assistantRoutes);

module.exports = app;