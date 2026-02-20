const http = require('http');
const https = require('https');
const url = require('url');
const crypto = require('crypto');
const TempMail = require('./tempmail');

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "NEXUS-MASTER-ADMIN-SECRET-KEY";

// Tokens iniciais válidos (Simulando um DB em memória)
let validTokens = ["NEXUS-ADMIN-123", "NEXUS-DEV-456"];

// Lógica de 2FA (TOTP) migrada da extensão para a API
const TOTP = {
  dec2hex: (s) => (s < 15.5 ? "0" : "") + Math.round(s).toString(16),
  hex2dec: (h) => parseInt(h, 16),
  base32tohex: (base32) => {
    let base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = "";
    let hex = "";
    for (let i = 0; i < base32.length; i++) {
      let val = base32chars.indexOf(base32.charAt(i).toUpperCase());
      bits += val.toString(2).padStart(5, '0');
    }
    for (let i = 0; i + 4 <= bits.length; i += 4) {
      let chunk = bits.substr(i, 4);
      hex = hex + parseInt(chunk, 2).toString(16);
    }
    return hex;
  },
  generate: async (secret) => {
    try {
      let key = TOTP.base32tohex(secret);
      let epoch = Math.round(new Date().getTime() / 1000.0);
      let time = Math.floor(epoch / 30).toString(16).padStart(16, '0');
      
      // Nota: Em Node.js puro, usamos a biblioteca crypto para o HMAC-SHA1
      const hmac = crypto.createHmac('sha1', Buffer.from(key, 'hex'));
      hmac.update(Buffer.from(time, 'hex'));
      const h = hmac.digest('hex');
      
      let offset = TOTP.hex2dec(h.substring(h.length - 1));
      let otp = (TOTP.hex2dec(h.substr(offset * 2, 8)) & TOTP.hex2dec("7fffffff")) + "";
      otp = otp.substr(otp.length - 6, 6);
      return otp;
    } catch (e) {
      return "000000";
    }
  }
};

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  // --- ROTA DE STATUS ---
  if (path === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Nexus Beams X API is online! Lógica protegida e ativa.');
    return;
  }

  // --- ROTA DE VALIDAÇÃO DE TOKEN ---
  if (path === '/api/validate-token' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { token } = JSON.parse(body);
        if (validTokens.includes(token)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: "Token válido!" }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: "Token inválido!" }));
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: "Erro no formato JSON." }));
      }
    });
    return;
  }

  // --- ROTA DE GERAÇÃO DE 2FA (Lógica Protegida) ---
  if (path === '/api/get-2fa' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { token, secret } = JSON.parse(body);
        if (!validTokens.includes(token)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: "Acesso negado." }));
          return;
        }
        const code = await TOTP.generate(secret);
        const epoch = Math.round(new Date().getTime() / 1000.0);
        const timeLeft = 30 - (epoch % 30);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, code, timeLeft }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
      }
    });
    return;
  }

  // --- ROTA DE E-MAIL TEMPORÁRIO (Lógica Protegida) ---
  if (path === '/api/temp-email' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { token, action, email, password, mailToken } = JSON.parse(body);
        if (!validTokens.includes(token)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false }));
          return;
        }

        let result;
        if (action === 'create') {
          const domains = await TempMail.request('/domains');
          const domain = domains['hydra:member'][0].domain;
          const address = `${Math.random().toString(36).substring(2, 12)}@${domain}`;
          const pass = Math.random().toString(36).substring(2, 15);
          await TempMail.createAccount(address, pass);
          const auth = await TempMail.getToken(address, pass);
          result = { address, token: auth.token };
        } else if (action === 'messages') {
          result = await TempMail.getMessages(mailToken);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: result }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // --- ROTA DE WEBHOOK LOG ---
  if (path === '/api/webhook-log' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { webhookUrl, event, data, ip, token } = JSON.parse(body);
        if (!validTokens.includes(token)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: "Token inválido para log." }));
          return;
        }

        const embeds = [{
          title: `🔔 Nexus Beams X: ${event}`,
          color: 3066993,
          fields: [
            { name: "Evento", value: event, inline: true },
            { name: "IP", value: ip || "Desconhecido", inline: true },
            { name: "Data", value: new Date().toLocaleString('pt-BR'), inline: false }
          ],
          timestamp: new Date()
        }];

        if (data) {
          Object.keys(data).forEach(key => {
            if (key !== 'token') embeds[0].fields.push({ name: key, value: String(data[key]), inline: true });
          });
        }

        const postData = JSON.stringify({ embeds });
        const webhookParsed = url.parse(webhookUrl);
        
        const options = {
          hostname: webhookParsed.hostname,
          path: webhookParsed.path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        const webhookReq = https.request(options, (webhookRes) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        });

        webhookReq.on('error', () => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false }));
        });

        webhookReq.write(postData);
        webhookReq.end();
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
      }
    });
    return;
  }

  // --- ROTA DE GERAÇÃO DE NOVOS TOKENS (Admin) ---
  if (path === '/api/generate-token' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { adminKey, newToken } = JSON.parse(body);
        if (adminKey === ADMIN_KEY) {
          validTokens.push(newToken);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: `Token ${newToken} gerado!` }));
        } else {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false }));
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`Nexus API rodando na porta ${PORT}`);
});
