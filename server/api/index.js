const app = require("../app");
const { connectDB } = require("../database/db");

let dbInitPromise;

async function ensureDbConnection() {
  if (!dbInitPromise) {
    dbInitPromise = connectDB().catch((error) => {
      dbInitPromise = undefined;
      throw error;
    });
  }

  return dbInitPromise;
}

module.exports = async (req, res) => {
  await ensureDbConnection();
  return app(req, res);
};