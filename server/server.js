const { connectDB } = require("./database/db");
const app = require("./app");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
};

startServer();
