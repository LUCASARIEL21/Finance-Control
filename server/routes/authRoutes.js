const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', async (req, res) => {
    const { nome, dataNascimento, email, senha } = req.body;

    if (!nome || !dataNascimento || !email || !senha) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }

    try {
        const senhaHash = await bcrypt.hash(senha, 10);

        const novoUsuario = new User({
            nome,
            dataNascimento,
            email,
            senha: senhaHash
        });

        await novoUsuario.save();
        res.status(201).json({ message: "Usuário cadastrado com sucesso!" });
    } catch (error) {
        res.status(500).json({ error: "Erro ao cadastrar usuário" });
    }
});

router.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Usuário não encontrado" });
        }

        const senhaCorreta = await bcrypt.compare(senha, user.senha);
        if (!senhaCorreta) {
            return res.status(401).json({ error: "Credenciais inválidas" });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: "Erro no servidor" });
    }
});

router.get('/perfil', authMiddleware, async (req, res) => {
    try {
        const usuario = await User.findById(req.user.id).select('-senha');
        if (!usuario) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }
        res.json(usuario);
    } catch (error) {
        res.status(500).json({ error: "Erro no servidor" });
    }
});

router.put('/trocar-senha', authMiddleware, async (req, res) => {
    const { senhaAtual, novaSenha } = req.body;
  
    if (!senhaAtual || !novaSenha) {
      return res.status(400).json({ mensagem: "Senha atual e nova senha são obrigatórias." });
    }
  
    try {
      const user = await User.findById(req.user.id);
  
      if (!user) {
        return res.status(404).json({ mensagem: "Usuário não encontrado." });
      }
  
      const match = await bcrypt.compare(senhaAtual, user.senha);
  
      if (!match) {
        return res.status(401).json({ mensagem: "Senha atual incorreta." });
      }
  
      user.senha = await bcrypt.hash(novaSenha, 10);
      await user.save();
  
      res.status(200).json({ mensagem: "Senha alterada com sucesso!" });
    } catch (error) {
      console.error("Erro ao alterar senha", error);
      res.status(500).json({ mensagem: "Erro ao alterar a senha." });
    }
});

router.get('/user', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar usuário' });
    }
});

module.exports = router;