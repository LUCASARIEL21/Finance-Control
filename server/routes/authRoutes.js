const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../database/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ'\-\s]+$/u;

const normalizeName = (nome) => nome.trim().replace(/\s+/g, ' ');
const AUTH_ERROR_MESSAGE = 'Credenciais inválidas.';

const isValidBirthDate = (birthDate) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return false;

    const [year, month, day] = birthDate.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    const sameDate =
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day;

    if (!sameDate) return false;

    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    return date <= todayUtc && year >= 1900;
};

const passwordHasNamePart = (senha, nome) => {
    const senhaLower = senha.toLowerCase();
    const tokens = normalizeName(nome)
        .toLowerCase()
        .split(' ')
        .map((part) => part.replace(/[^a-zà-öø-ÿ]/g, ''))
        .filter((part) => part.length >= 3);

    return tokens.some((part) => senhaLower.includes(part));
};

const validateRegisterInput = ({ nome, dataNascimento, email, senha, confirmSenha }) => {
    if (!nome || !dataNascimento || !email || !senha || !confirmSenha) {
        return 'Todos os campos são obrigatórios';
    }

    const nomeNormalizado = normalizeName(nome);
    const parts = nomeNormalizado.split(' ').filter(Boolean);

    if (parts.length < 2 || !NOME_REGEX.test(nomeNormalizado) || parts.some((part) => part.length < 2)) {
        return 'Informe um nome completo válido (nome e sobrenome, apenas letras).';
    }

    if (!isValidBirthDate(dataNascimento)) {
        return 'Informe uma data de nascimento válida.';
    }

    if (!EMAIL_REGEX.test(email)) {
        return 'Informe um e-mail válido.';
    }

    const hasMinLength = senha.length >= 12;
    const hasUpper = /[A-Z]/.test(senha);
    const hasLower = /[a-z]/.test(senha);
    const hasNumber = /\d/.test(senha);
    const hasSpecial = /[^A-Za-z0-9]/.test(senha);

    if (!(hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial)) {
        return 'A senha deve ter no mínimo 12 caracteres, com letra maiúscula, minúscula, número e caractere especial.';
    }

    if (passwordHasNamePart(senha, nomeNormalizado)) {
        return 'A senha não pode conter partes do nome completo.';
    }

    if (senha !== confirmSenha) {
        return 'A confirmação da senha deve ser igual à senha digitada.';
    }

    return null;
};

const mapUser = (row) => ({
    id: row.id,
    nome: row.nome,
    dataNascimento: row.data_nascimento,
    email: row.email,
});

router.post('/register', async (req, res) => {
    const { nome, dataNascimento, email, senha, confirmSenha } = req.body;
    const validationError = validateRegisterInput({ nome, dataNascimento, email, senha, confirmSenha });

    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    try {
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

        if (existingUser.rowCount > 0) {
            return res.status(409).json({ error: 'E-mail já cadastrado' });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        await pool.query(
            'INSERT INTO users (nome, data_nascimento, email, senha) VALUES ($1, $2, $3, $4)',
            [normalizeName(nome), dataNascimento, email.toLowerCase(), senhaHash]
        );

        res.status(201).json({ message: "Usuário cadastrado com sucesso!" });
    } catch (error) {
        console.error('Erro em /register:', error);
        res.status(500).json({ error: "Erro ao cadastrar usuário" });
    }
});

router.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    try {
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ error: 'Configuração de autenticação ausente.' });
        }

        const result = await pool.query(
            'SELECT id, senha FROM users WHERE email = $1',
            [email?.trim().toLowerCase()]
        );

        if (result.rowCount === 0) {
            return res.status(401).json({ error: AUTH_ERROR_MESSAGE });
        }

        const user = result.rows[0];

        const senhaCorreta = await bcrypt.compare(senha, user.senha);
        if (!senhaCorreta) {
            return res.status(401).json({ error: AUTH_ERROR_MESSAGE });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 3_600_000,
            path: '/',
        });
        res.json({
            message: 'Login realizado com sucesso.',
            token,
        });
    } catch (error) {
        res.status(500).json({ error: "Erro no servidor" });
    }
});

router.post('/logout', (_req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('auth_token', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
    });
    res.json({ message: 'Sessão encerrada.' });
});

router.get('/perfil', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, nome, data_nascimento, email FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        res.json(mapUser(result.rows[0]));
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
            const result = await pool.query(
                'SELECT id, nome, data_nascimento, senha FROM users WHERE id = $1',
                [req.user.id]
            );

            if (result.rowCount === 0) {
        return res.status(404).json({ mensagem: "Usuário não encontrado." });
      }
  
            const user = result.rows[0];
            const match = await bcrypt.compare(senhaAtual, user.senha);
  
      if (!match) {
        return res.status(401).json({ mensagem: "Senha atual incorreta." });
      }

            if (senhaAtual === novaSenha) {
                return res.status(400).json({ mensagem: 'A nova senha deve ser diferente da senha atual.' });
            }

            const passwordValidationError = validateRegisterInput({
                nome: user.nome,
                dataNascimento: user.data_nascimento instanceof Date
                    ? user.data_nascimento.toISOString().split('T')[0]
                    : String(user.data_nascimento),
                email: 'validacao@interna.local',
                senha: novaSenha,
                confirmSenha: novaSenha,
            });

            if (passwordValidationError) {
                return res.status(400).json({ mensagem: passwordValidationError });
            }
  
            const novaSenhaHash = await bcrypt.hash(novaSenha, 10);
            await pool.query(
                'UPDATE users SET senha = $1 WHERE id = $2',
                [novaSenhaHash, req.user.id]
            );
  
      res.status(200).json({ mensagem: "Senha alterada com sucesso!" });
    } catch (error) {
      console.error("Erro ao alterar senha", error);
      res.status(500).json({ mensagem: "Erro ao alterar a senha." });
    }
});

router.get('/user', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, nome, data_nascimento, email FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        res.json(mapUser(result.rows[0]));
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar usuário' });
    }
});

module.exports = router;