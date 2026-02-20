const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || "NEXUS-MASTER-ADMIN-SECRET-KEY";

// Tokens iniciais válidos
let validTokens = ["NEXUS-ADMIN-123", "NEXUS-DEV-456"];

const server = http.createServer((req, res) => {
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

  if (path === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Nexus Beams X API is online! (Pure JS)');
    return;
  }

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

  if (path === '/api/webhook-log' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { webhookUrl, event, data, ip } = JSON.parse(body);
        if (!webhookUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: "Webhook URL necessária." }));
          return;
        }

        const embeds = [{
          title: `🔔 Alerta do Sistema: ${event}`,
          color: event === 'Login' ? 3066993 : 15158332,
          fields: [
            { name: "Evento", value: event, inline: true },
            { name: "IP", value: ip || "Desconhecido", inline: true },
            { name: "Data", value: new Date().toLocaleString('pt-BR'), inline: false }
          ],
          timestamp: new Date()
        }];

        if (data) {
          Object.keys(data).forEach(key => {
            embeds[0].fields.push({ name: key, value: String(data[key]), inline: true });
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
          res.end(JSON.stringify({ success: true, message: "Log enviado!" }));
        });

        webhookReq.on('error', (e) => {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: "Erro ao enviar webhook." }));
        });

        webhookReq.write(postData);
        webhookReq.end();

      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: "Erro ao processar log." }));
      }
    });
    return;
  }

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
          res.end(JSON.stringify({ success: false, message: "Acesso negado." }));
        }
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: "Erro ao processar geração." }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`Server rodando na porta ${PORT}`);
});
