const express = require('express');
const cors = require('cors');
const { authenticator } = require('otplib');
const path = require('path');
const fs = require('fs');
const tempMail = require('./tempmail');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Persistência ---
function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { tokens: {}, adminPassword: 'admin' };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// --- Logs ---
function logMessage(msg) {
  console.log('---');
  console.log(msg);
  console.log('---');
}

// --- Geolocalização (Haversine) ---
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// --- Middleware de Validação ---
const validateToken = (req, res, next) => {
  const tokenStr = req.headers['x-access-token'];
  const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const userLat = parseFloat(req.headers['x-lat']);
  const userLon = parseFloat(req.headers['x-lon']);

  if (!tokenStr) return res.status(401).json({ success: false, error: "Token ausente" });

  const data = loadData();
  const tokenData = data.tokens[tokenStr];

  if (!tokenData) return res.status(403).json({ success: false, error: "Token inválido" });

  if (!tokenData.linkedIp) {
    tokenData.linkedIp = userIp;
    tokenData.lastLat = userLat;
    tokenData.lastLon = userLon;
    saveData(data);
    logMessage(`[👤] Token ${tokenStr} vinculado ao IP: ${userIp}`);
  } else if (tokenData.linkedIp !== userIp) {
    if (isNaN(userLat) || isNaN(userLon) || isNaN(tokenData.lastLat) || isNaN(tokenData.lastLon)) {
      return res.status(403).json({ success: false, error: "IP não autorizado e geolocalização indisponível" });
    }
    const distance = getDistance(tokenData.lastLat, tokenData.lastLon, userLat, userLon);
    if (distance > 1) {
      logMessage(`[❌] Acesso negado: IP ${userIp} fora do raio de 1km (${distance.toFixed(2)}km)`);
      return res.status(403).json({ success: false, error: "Acesso negado: Fora do raio permitido (1km)" });
    }
  }

  req.tokenData = tokenData;
  req.tokenStr = tokenStr;
  next();
};

// --- Rotas Admin ---
app.post('/api/admin/token', (req, res) => {
  const { adminPassword, token, name, action } = req.body;
  const data = loadData();
  if (adminPassword !== data.adminPassword) return res.status(403).json({ success: false, error: "Senha incorreta" });

  if (action === 'delete') {
    delete data.tokens[token];
    logMessage(`[🗑️] Token removido: ${token}`);
  } else {
    data.tokens[token] = { name: name || "Sem nome", linkedIp: null, lastLat: null, lastLon: null, webhook: null, password: null, configured: false };
    logMessage(`[🛡️] Novo token criado: ${token}`);
  }
  saveData(data);
  res.json({ success: true, tokens: data.tokens });
});

app.post('/api/admin/list', (req, res) => {
  const { adminPassword } = req.body;
  const data = loadData();
  if (adminPassword !== data.adminPassword) return res.status(403).json({ success: false });
  res.json({ success: true, tokens: data.tokens });
});

// --- Rotas Usuário ---
app.get('/api/user/check', validateToken, (req, res) => {
  res.json({ success: true, configured: req.tokenData.configured, name: req.tokenData.name });
});

app.post('/api/user/setup', validateToken, (req, res) => {
  const { password, webhook } = req.body;
  const data = loadData();
  data.tokens[req.tokenStr].password = password;
  data.tokens[req.tokenStr].webhook = webhook;
  data.tokens[req.tokenStr].configured = true;
  saveData(data);
  res.json({ success: true });
});

app.post('/api/user/unlink', validateToken, (req, res) => {
  const data = loadData();
  data.tokens[req.tokenStr].linkedIp = null;
  data.tokens[req.tokenStr].lastLat = null;
  data.tokens[req.tokenStr].lastLon = null;
  saveData(data);
  res.json({ success: true });
});

// --- Rotas Funcionais ---
app.get('/api/totp/:secret', validateToken, (req, res) => {
  try {
    const token = authenticator.generate(req.params.secret.replace(/\s/g, ''));
    res.json({ success: true, code: token });
  } catch (e) { res.status(400).json({ success: false }); }
});

app.get('/api/mail/domains', validateToken, async (req, res) => {
  try { res.json(await tempMail.getDomains()); } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/mail/accounts', validateToken, async (req, res) => {
  try { res.json(await tempMail.createAccount(req.body.address, req.body.password)); } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/mail/token', validateToken, async (req, res) => {
  try { res.json(await tempMail.getToken(req.body.address, req.body.password)); } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/mail/messages', validateToken, async (req, res) => {
  try { 
    const token = req.headers.authorization.split(' ')[1];
    res.json(await tempMail.getMessages(token)); 
  } catch (e) { res.status(500).json({ success: false }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  logMessage(`[🛡️] Nexus Beams X API Ativa`);
});
