import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { TOTP } from './totp.js';
import { TempMail } from './tempmail.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// ENDPOINTS DE 2FA / TOTP
// ============================================

app.post('/api/totp/generate', (req, res) => {
  try {
    const { secret } = req.body;
    if (!secret) return res.status(400).json({ success: false, error: 'Chave secreta é obrigatória' });

    const code = TOTP.generate(secret);
    const timeRemaining = TOTP.getTimeRemaining();

    if (!code) return res.status(400).json({ success: false, error: 'Chave secreta inválida' });

    res.json({ success: true, code, timeRemaining });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ENDPOINTS DE E-MAIL TEMPORÁRIO
// ============================================

const tempMail = new TempMail();

app.post('/api/tempmail/create', async (req, res) => {
  try {
    const account = await tempMail.createAccount();
    res.json({ success: true, ...account });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/tempmail/messages/:token', async (req, res) => {
  try {
    const messages = await tempMail.getMessages(req.params.token);
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/tempmail/message/:token/:messageId', async (req, res) => {
  try {
    const message = await tempMail.getMessageDetail(req.params.token, req.params.messageId);
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ENDPOINTS DE ROBUX / AUTOMAÇÃO
// ============================================

app.post('/api/robux/update', (req, res) => {
  res.json({ success: true, message: 'Automação iniciada' });
});

app.post('/api/robux/complete/:id', (req, res) => {
  res.json({ success: true, message: 'Automação concluída' });
});

// ============================================
// ENDPOINTS DE INFORMAÇÃO
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'online', version: '3.5.1', timestamp: new Date().toISOString() });
});

app.get('/api/docs', (req, res) => {
  res.json({ success: true, name: 'Nexus Beams X API', version: '3.5.1' });
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Nexus Beams X API</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 50px; background: #f4f7f6; }
        .card { background: white; padding: 30px; border-radius: 15px; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        h1 { color: #6a00ff; }
        .status { color: #00b894; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>⚡ Nexus Beams X API</h1>
        <p>Status: <span class="status">ONLINE (v3.5.1)</span></p>
        <p>A interface visual está integrada na extensão Chrome.</p>
        <hr>
        <p><a href="/api/docs">Ver Documentação da API</a></p>
      </div>
    </body>
    </html>
  `);
});

// Tratamento de erros 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint não encontrado' });
});

// Inicia servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Nexus Beams X API rodando na porta ${PORT}`);
});
