const express = require('express');
const cors = require('cors');
const { totp } = require('otplib');
const tempmail = require('./tempmail');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.json({ name: "Nexus Beams X API", status: "Online" });
});

app.post('/api/totp', (req, res) => {
    const { secret } = req.body;
    if (!secret) return res.status(400).json({ error: 'Secret é necessário' });
    try {
        const code = totp.generate(secret.replace(/\s/g, ''));
        const remaining = totp.timeRemaining();
        res.json({ code, remaining });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao gerar TOTP' });
    }
});

app.post('/api/mail/check', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token é necessário' });
    try {
        const result = await tempmail.checkMessages(token);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao verificar e-mails' });
    }
});

app.listen(PORT, () => {
    console.log(`API rodando na porta ${PORT}`);
});
