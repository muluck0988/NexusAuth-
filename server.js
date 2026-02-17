import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { TOTP } from './totp.js';
import { TempMail } from './tempmail.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Banco de dados simples para Tokens (usando /tmp para garantir permissão no Render)
const DB_PATH = process.env.NODE_ENV === 'production' ? '/tmp/tokens.json' : path.join(__dirname, 'tokens.json');
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({}));

function getTokens() { 
  try {
    return JSON.parse(fs.readFileSync(DB_PATH)); 
  } catch (e) {
    return {};
  }
}
function saveTokens(tokens) { 
  fs.writeFileSync(DB_PATH, JSON.stringify(tokens, null, 2)); 
}

// Middleware para capturar IP real (considerando proxy do Render)
app.set('trust proxy', true);
const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  return forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
};

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// SISTEMA DE SEGURANÇA (TOKENS & IP)
// ============================================

// 1. Gerar Token (Admin - Requer ADMIN_KEY no Header)
app.post('/api/admin/generate-token', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== 'NEXUS_ADMIN_2026') {
    return res.status(403).json({ success: false, error: 'Acesso negado' });
  }

  const token = Math.random().toString(36).substring(2, 15).toUpperCase();
  const tokens = getTokens();
  tokens[token] = { ip: null, password: null, active: true, createdAt: new Date() };
  saveTokens(tokens);

  res.json({ success: true, token });
});

// 2. Validar Token e Vincular IP/Senha
app.post('/api/auth/validate', (req, res) => {
  const { token, password } = req.body;
  const ip = getClientIp(req);
  const tokens = getTokens();

  if (!token || !tokens[token]) {
    return res.status(401).json({ success: false, error: 'Token inválido' });
  }
  
  const tData = tokens[token];

  // Primeiro uso: Vincular IP e Senha
  if (!tData.ip) {
    if (!password) return res.json({ success: true, needsSetup: true, message: 'Defina uma senha para este token' });
    tData.ip = ip;
    tData.password = password;
    saveTokens(tokens);
    return res.json({ success: true, message: 'Token ativado e IP vinculado!' });
  }

  // Uso subsequente: Verificar IP
  if (tData.ip !== ip) {
    return res.status(403).json({ success: false, error: 'IP não autorizado', needsReset: true });
  }

  res.json({ success: true, message: 'Acesso autorizado' });
});

// 3. Resetar IP (Usando a Senha)
app.post('/api/auth/reset-ip', (req, res) => {
  const { token, password } = req.body;
  const ip = getClientIp(req);
  const tokens = getTokens();

  if (!token || !tokens[token]) {
    return res.status(401).json({ success: false, error: 'Token inválido' });
  }
  
  const tData = tokens[token];
  if (tData.password !== password) {
    return res.status(403).json({ success: false, error: 'Senha incorreta' });
  }

  tData.ip = ip; // Vincula ao novo IP
  saveTokens(tokens);
  res.json({ success: true, message: 'IP resetado com sucesso!' });
});

// Middleware de Proteção Global para Endpoints da API
const protectApi = (req, res, next) => {
  const token = req.headers['x-nexus-token'];
  const ip = getClientIp(req);
  const tokens = getTokens();

  if (!token || !tokens[token] || tokens[token].ip !== ip) {
    return res.status(401).json({ success: false, error: 'Não autorizado. Token ou IP inválido.' });
  }
  next();
};

// ============================================
// ENDPOINTS DE 2FA / TOTP
// ============================================

app.post('/api/totp/generate', protectApi, (req, res) => {
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

app.post('/api/tempmail/create', protectApi, async (req, res) => {
  try {
    const account = await tempMail.createAccount();
    res.json({ success: true, ...account });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/tempmail/messages/:token', protectApi, async (req, res) => {
  try {
    const messages = await tempMail.getMessages(req.params.token);
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/tempmail/message/:token/:messageId', protectApi, async (req, res) => {
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

app.post('/api/robux/update', protectApi, (req, res) => {
  res.json({ success: true, message: 'Automação iniciada' });
});

app.post('/api/robux/complete/:id', protectApi, (req, res) => {
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
