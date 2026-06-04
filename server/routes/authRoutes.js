const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { pool } = require('../database/db');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NOME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ'\-\s]+$/u;

const normalizeName = (nome) => nome.trim().replace(/\s+/g, ' ');
const AUTH_ERROR_MESSAGE = 'Credenciais inválidas.';
const RESET_TOKEN_TTL_MINUTES = 60;

let passwordResetTableInitPromise;
let mailTransporter;
let mailTransporterVerifyPromise;

const ensurePasswordResetTable = async () => {
    if (!passwordResetTableInitPromise) {
        passwordResetTableInitPromise = pool.query(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash TEXT NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                used_at TIMESTAMPTZ NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
                ON password_reset_tokens(user_id);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash
                ON password_reset_tokens(token_hash);
            CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
                ON password_reset_tokens(expires_at);
        `);
    }

    return passwordResetTableInitPromise;
};

const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const maskEmail = (email) => {
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return 'email-invalido';
    }

    const [user, domain] = email.split('@');
    const userVisible = user.length <= 2 ? user : `${user.slice(0, 2)}***`;
    return `${userVisible}@${domain}`;
};

const getMailTransporter = () => {
    if (mailTransporter) {
        return mailTransporter;
    }

    const gmailUser = (
        process.env.GMAIL_USER ||
        process.env.SMTP_USER ||
        'lucas.ariel.fr@gmail.com'
    ).trim();
    const gmailAppPassword = (
        process.env.GMAIL_APP_PASSWORD ||
        process.env.SMTP_PASS ||
        ''
    ).replace(/\s+/g, '');
    const smtpHost = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpSecure = String(process.env.SMTP_SECURE || 'true').toLowerCase() !== 'false';

    if (!gmailAppPassword) {
        return null;
    }

    mailTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number.isFinite(smtpPort) ? smtpPort : 465,
        secure: smtpSecure,
        auth: {
            user: gmailUser,
            pass: gmailAppPassword,
        },
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
        socketTimeout: 20_000,
    });

    mailTransporterVerifyPromise = mailTransporter
        .verify()
        .then(() => {
            console.log(`[mail] SMTP pronto para envio com ${maskEmail(gmailUser)} via ${smtpHost}:${smtpPort}.`);
        })
        .catch((error) => {
            console.error('[mail] Falha ao validar SMTP na inicialização:', error?.message || error);
            throw error;
        });

    return mailTransporter;
};

const sendResetPasswordEmail = async ({ to, resetUrl }) => {
    const transporter = getMailTransporter();

    if (!transporter) {
        console.error('Serviço de e-mail não configurado. Defina GMAIL_APP_PASSWORD no backend.');
        return false;
    }

    const fromAddress = (process.env.MAIL_FROM || process.env.GMAIL_USER || 'lucas.ariel.fr@gmail.com').trim();

    try {
        if (mailTransporterVerifyPromise) {
            await mailTransporterVerifyPromise;
        }

        await transporter.sendMail({
            from: fromAddress,
            to,
            subject: 'Redefinição de senha - Finance Control',
            text: `Olá!\n\nRecebemos uma solicitação para redefinir sua senha.\nAcesse o link abaixo para criar uma nova senha (válido por ${RESET_TOKEN_TTL_MINUTES} minutos):\n\n${resetUrl}\n\nSe você não solicitou, ignore este e-mail.`,
            html: `
                <p>Olá!</p>
                <p>Recebemos uma solicitação para redefinir sua senha.</p>
                <p>Use o link abaixo para criar uma nova senha (válido por <strong>${RESET_TOKEN_TTL_MINUTES} minutos</strong>):</p>
                <p><a href="${resetUrl}">${resetUrl}</a></p>
                <p>Se você não solicitou, ignore este e-mail.</p>
            `,
        });

        console.log(`[mail] E-mail de redefinição enviado para ${maskEmail(to)}.`);
        return true;
    } catch (error) {
        console.error(`[mail] Erro ao enviar e-mail de redefinição para ${maskEmail(to)}:`, error?.message || error);
        return false;
    }
};

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

router.post('/forgot-password', async (req, res) => {
    const email = req.body?.email?.trim().toLowerCase();

    if (!email || !EMAIL_REGEX.test(email)) {
        return res.status(400).json({ error: 'Informe um e-mail válido.' });
    }

    try {
        await ensurePasswordResetTable();

        const userResult = await pool.query(
            'SELECT id, email FROM users WHERE email = $1',
            [email]
        );

        if (userResult.rowCount > 0) {
            const user = userResult.rows[0];
            const rawToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = hashResetToken(rawToken);

            await pool.query(
                `DELETE FROM password_reset_tokens
                 WHERE user_id = $1 OR expires_at <= NOW() OR used_at IS NOT NULL`,
                [user.id]
            );

            await pool.query(
                `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
                 VALUES ($1, $2, NOW() + ($3::text || ' minutes')::interval)`,
                [user.id, tokenHash, String(RESET_TOKEN_TTL_MINUTES)]
            );

            const frontendBaseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
            const resetPath = process.env.RESET_PASSWORD_PATH || '/resetar-senha';
            const resetUrl = `${frontendBaseUrl}${resetPath}?token=${encodeURIComponent(rawToken)}`;

            await sendResetPasswordEmail({ to: user.email, resetUrl });
        }

        return res.json({
            message: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.',
        });
    } catch (error) {
        console.error('Erro em /forgot-password:', error);
        return res.status(500).json({ error: 'Não foi possível processar a solicitação no momento.' });
    }
});

router.post('/reset-password/validate', async (req, res) => {
    const token = req.body?.token?.trim();

    if (!token) {
        return res.status(400).json({ error: 'Token inválido.' });
    }

    try {
        await ensurePasswordResetTable();

        const tokenHash = hashResetToken(token);
        const result = await pool.query(
            `SELECT id
             FROM password_reset_tokens
             WHERE token_hash = $1
               AND used_at IS NULL
               AND expires_at > NOW()
             LIMIT 1`,
            [tokenHash]
        );

        if (result.rowCount === 0) {
            return res.status(400).json({ error: 'Link inválido ou expirado.' });
        }

        return res.json({ message: 'Token válido.' });
    } catch (error) {
        console.error('Erro em /reset-password/validate:', error);
        return res.status(500).json({ error: 'Erro ao validar token.' });
    }
});

router.post('/reset-password/confirm', async (req, res) => {
    const token = req.body?.token?.trim();
    const novaSenha = req.body?.novaSenha;
    const confirmNovaSenha = req.body?.confirmNovaSenha;

    if (!token || !novaSenha || !confirmNovaSenha) {
        return res.status(400).json({ error: 'Token, nova senha e confirmação são obrigatórios.' });
    }

    if (novaSenha !== confirmNovaSenha) {
        return res.status(400).json({ error: 'A confirmação da senha deve ser igual à senha digitada.' });
    }

    const client = await pool.connect();

    try {
        await ensurePasswordResetTable();
        await client.query('BEGIN');

        const tokenHash = hashResetToken(token);
        const tokenResult = await client.query(
            `SELECT prt.id, prt.user_id, u.nome, u.data_nascimento, u.senha
             FROM password_reset_tokens prt
             INNER JOIN users u ON u.id = prt.user_id
             WHERE prt.token_hash = $1
               AND prt.used_at IS NULL
               AND prt.expires_at > NOW()
             LIMIT 1
             FOR UPDATE`,
            [tokenHash]
        );

        if (tokenResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Link inválido ou expirado.' });
        }

        const tokenRow = tokenResult.rows[0];
        const mesmaSenha = await bcrypt.compare(novaSenha, tokenRow.senha);

        if (mesmaSenha) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'A nova senha deve ser diferente da senha atual.' });
        }

        const passwordValidationError = validateRegisterInput({
            nome: tokenRow.nome,
            dataNascimento: tokenRow.data_nascimento instanceof Date
                ? tokenRow.data_nascimento.toISOString().split('T')[0]
                : String(tokenRow.data_nascimento),
            email: 'validacao@interna.local',
            senha: novaSenha,
            confirmSenha: confirmNovaSenha,
        });

        if (passwordValidationError) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: passwordValidationError });
        }

        const novaSenhaHash = await bcrypt.hash(novaSenha, 10);

        await client.query(
            'UPDATE users SET senha = $1, updated_at = NOW() WHERE id = $2',
            [novaSenhaHash, tokenRow.user_id]
        );

        await client.query(
            `UPDATE password_reset_tokens
             SET used_at = NOW()
             WHERE user_id = $1 AND used_at IS NULL`,
            [tokenRow.user_id]
        );

        await client.query('COMMIT');
        return res.json({ message: 'Senha redefinida com sucesso!' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro em /reset-password/confirm:', error);
        return res.status(500).json({ error: 'Não foi possível redefinir a senha.' });
    } finally {
        client.release();
    }
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