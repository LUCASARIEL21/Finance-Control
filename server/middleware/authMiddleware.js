const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ mensagem: 'Configuração de autenticação ausente.' });
  }

  const token = req.cookies?.auth_token || req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token não fornecido' });
  }  

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ mensagem: "Token inválido." });
  }
};

module.exports = authMiddleware;