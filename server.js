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
app.use(express.static('public'));

// Armazenamento em memória (para produção, usar banco de dados)
const storage = new Map();

// ============================================
// ENDPOINTS DE 2FA / TOTP
// ============================================

/**
 * POST /api/totp/generate
 * Gera código TOTP a partir de uma chave secreta
 * Body: { secret: string }
 */
app.post('/api/totp/generate', (req, res) => {
  try {
    const { secret } = req.body;
    
    if (!secret) {
      return res.status(400).json({ 
        success: false, 
        error: 'Chave secreta é obrigatória' 
      });
    }

    const code = TOTP.generate(secret);
    const timeRemaining = TOTP.getTimeRemaining();

    if (!code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Chave secreta inválida' 
      });
    }

    res.json({
      success: true,
      code,
      timeRemaining,
      expiresAt: new Date(Date.now() + timeRemaining * 1000).toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/totp/validate
 * Valida um código TOTP
 * Body: { secret: string, code: string }
 */
app.post('/api/totp/validate', (req, res) => {
  try {
    const { secret, code } = req.body;
    
    if (!secret || !code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Chave secreta e código são obrigatórios' 
      });
    }

    const isValid = TOTP.validate(secret, code);

    res.json({
      success: true,
      valid: isValid
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// ENDPOINTS DE E-MAIL TEMPORÁRIO
// ============================================

/**
 * POST /api/tempmail/create
 * Cria uma nova conta de e-mail temporário
 */
app.post('/api/tempmail/create', async (req, res) => {
  try {
    const tempMail = new TempMail();
    const account = await tempMail.createAccount();
    
    // Armazena token para uso posterior
    storage.set(account.address, {
      token: account.token,
      password: account.password,
      createdAt: new Date()
    });

    res.json({
      success: true,
      email: account.address,
      token: account.token
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/tempmail/messages/:token
 * Lista mensagens da caixa de entrada
 */
app.get('/api/tempmail/messages/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const tempMail = new TempMail();
    const messages = await tempMail.getMessages(token);

    res.json({
      success: true,
      count: messages.length,
      messages: messages.map(msg => ({
        id: msg.id,
        from: msg.from,
        subject: msg.subject,
        intro: msg.intro,
        createdAt: msg.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/tempmail/message/:token/:messageId
 * Obtém detalhes de uma mensagem específica
 */
app.get('/api/tempmail/message/:token/:messageId', async (req, res) => {
  try {
    const { token, messageId } = req.params;
    const tempMail = new TempMail();
    const message = await tempMail.getMessage(token, messageId);

    const contentText = message.text || '';
    const contentHtml = message.html ? message.html.join('') : '';
    const fullContent = contentText + contentHtml;

    const code = tempMail.extractVerificationCode(fullContent);
    const verifyLink = tempMail.extractVerifyLink(fullContent);
    const revertLink = tempMail.extractRevertLink(fullContent);

    res.json({
      success: true,
      message: {
        id: message.id,
        from: message.from,
        subject: message.subject,
        text: message.text,
        html: message.html,
        code,
        verifyLink,
        revertLink,
        createdAt: message.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/tempmail/wait
 * Aguarda recebimento de mensagem com código/link
 * Body: { token: string, timeout?: number }
 */
app.post('/api/tempmail/wait', async (req, res) => {
  try {
    const { token, timeout = 120000 } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Token é obrigatório' 
      });
    }

    const tempMail = new TempMail();
    const message = await tempMail.waitForMessage(token, timeout);

    res.json({
      success: true,
      message
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// ENDPOINTS DE CONFIGURAÇÃO
// ============================================

/**
 * POST /api/config/save
 * Salva configurações do usuário
 * Body: { userId: string, config: object }
 */
app.post('/api/config/save', (req, res) => {
  try {
    const { userId, config } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID do usuário é obrigatório' 
      });
    }

    storage.set(`config_${userId}`, {
      ...config,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Configurações salvas com sucesso'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/config/:userId
 * Obtém configurações do usuário
 */
app.get('/api/config/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const config = storage.get(`config_${userId}`);

    if (!config) {
      return res.status(404).json({ 
        success: false, 
        error: 'Configurações não encontradas' 
      });
    }

    res.json({
      success: true,
      config
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * DELETE /api/config/:userId
 * Remove configurações do usuário
 */
app.delete('/api/config/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    storage.delete(`config_${userId}`);

    res.json({
      success: true,
      message: 'Configurações removidas com sucesso'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// ENDPOINTS DE AUTOMAÇÃO ROBUX
// ============================================

/**
 * POST /api/robux/update
 * Inicia processo de atualização de GamePass
 * Body: { cookie: string, value: number, gameId: string, passId: string }
 */
app.post('/api/robux/update', (req, res) => {
  try {
    const { cookie, value, gameId, passId } = req.body;
    
    if (!cookie || !value || !gameId || !passId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Todos os campos são obrigatórios' 
      });
    }

    // Armazena dados da automação
    const automationId = `automation_${Date.now()}`;
    storage.set(automationId, {
      cookie,
      value,
      gameId,
      passId,
      status: 'pending',
      createdAt: new Date()
    });

    res.json({
      success: true,
      automationId,
      message: 'Automação iniciada',
      salesUrl: `https://create.roblox.com/dashboard/creations/experiences/${gameId}/passes/${passId}/sales`
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/robux/status/:automationId
 * Verifica status de uma automação
 */
app.get('/api/robux/status/:automationId', (req, res) => {
  try {
    const { automationId } = req.params;
    const automation = storage.get(automationId);

    if (!automation) {
      return res.status(404).json({ 
        success: false, 
        error: 'Automação não encontrada' 
      });
    }

    res.json({
      success: true,
      automation
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/robux/complete/:automationId
 * Marca automação como concluída
 */
app.post('/api/robux/complete/:automationId', (req, res) => {
  try {
    const { automationId } = req.params;
    const automation = storage.get(automationId);

    if (!automation) {
      return res.status(404).json({ 
        success: false, 
        error: 'Automação não encontrada' 
      });
    }

    automation.status = 'completed';
    automation.completedAt = new Date();
    storage.set(automationId, automation);

    res.json({
      success: true,
      message: 'Automação concluída',
      passUrl: `https://www.roblox.com/game-pass/${automation.passId}`
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// ENDPOINTS DE INFORMAÇÃO
// ============================================

/**
 * GET /api/health
 * Verifica saúde da API
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    version: '3.5.0',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/docs
 * Documentação da API
 */
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    name: 'Nexus Beams X API',
    version: '3.5.0',
    description: 'API REST para automação 2FA e gerenciamento Roblox',
    endpoints: {
      totp: {
        'POST /api/totp/generate': 'Gera código TOTP',
        'POST /api/totp/validate': 'Valida código TOTP'
      },
      tempmail: {
        'POST /api/tempmail/create': 'Cria e-mail temporário',
        'GET /api/tempmail/messages/:token': 'Lista mensagens',
        'GET /api/tempmail/message/:token/:messageId': 'Obtém mensagem específica',
        'POST /api/tempmail/wait': 'Aguarda mensagem com código'
      },
      config: {
        'POST /api/config/save': 'Salva configurações',
        'GET /api/config/:userId': 'Obtém configurações',
        'DELETE /api/config/:userId': 'Remove configurações'
      },
      robux: {
        'POST /api/robux/update': 'Inicia atualização de GamePass',
        'GET /api/robux/status/:automationId': 'Verifica status da automação',
        'POST /api/robux/complete/:automationId': 'Marca automação como concluída'
      },
      info: {
        'GET /api/health': 'Verifica saúde da API',
        'GET /api/docs': 'Documentação da API'
      }
    }
  });
});

// Rota principal - Status da API
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
        <p>Status: <span class="status">ONLINE</span></p>
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
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint não encontrado' 
  });
});

// Inicia servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Nexus Beams X API rodando na porta ${PORT}`);
  console.log(`📚 Documentação: http://localhost:${PORT}/api/docs`);
  console.log(`🌐 Interface: http://localhost:${PORT}`);
});
        
