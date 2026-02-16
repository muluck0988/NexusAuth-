# ⚡ NEXUS BEAMS X - API

API REST completa para automação de 2FA (TOTP), gerenciamento de e-mail temporário e automação de GamePass do Roblox.

## 🚀 Funcionalidades

- **🔐 Geração TOTP (2FA)**: Gera códigos de autenticação de dois fatores baseados em tempo
- **📧 E-mail Temporário**: Cria e gerencia contas de e-mail temporárias via Mail.tm
- **💎 Automação Robux**: Facilita alteração de preços de GamePass
- **⚙️ Gerenciamento de Configurações**: Salva e recupera configurações de usuários
- **🌐 Interface Web**: Interface visual completa e responsiva

## 📦 Tecnologias

- **Node.js** v22+
- **Express.js** - Framework web
- **CORS** - Habilitação de requisições cross-origin
- **node-fetch** - Cliente HTTP para APIs externas
- **Crypto** - Geração de códigos TOTP

## 🛠️ Instalação Local

### Pré-requisitos

- Node.js 22.x ou superior
- pnpm (recomendado) ou npm

### Passos

1. Clone o repositório ou extraia os arquivos

2. Instale as dependências:
```bash
pnpm install
# ou
npm install
```

3. Configure as variáveis de ambiente (opcional):
```bash
cp .env.example .env
```

4. Inicie o servidor:
```bash
pnpm start
# ou
npm start
```

5. Acesse a aplicação:
- Interface Web: http://localhost:3000
- Documentação: http://localhost:3000/api/docs
- Health Check: http://localhost:3000/api/health

## 🌍 Deploy no Render

### Método 1: Deploy via GitHub

1. Crie um repositório no GitHub e faça push do código

2. Acesse [Render](https://render.com) e crie uma conta

3. Clique em **New +** → **Web Service**

4. Conecte seu repositório GitHub

5. Configure o serviço:
   - **Name**: nexusbeams-api (ou nome de sua escolha)
   - **Environment**: Node
   - **Build Command**: `pnpm install` ou `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free (ou plano de sua escolha)

6. Clique em **Create Web Service**

### Método 2: Deploy Manual

1. Acesse [Render](https://render.com)

2. Clique em **New +** → **Web Service**

3. Escolha **Deploy from Git** ou **Public Git repository**

4. Configure conforme método 1

### Variáveis de Ambiente no Render

No painel do Render, vá em **Environment** e adicione:

```
PORT=3000
NODE_ENV=production
```

## 📚 Documentação da API

### Endpoints de TOTP

#### POST `/api/totp/generate`
Gera um código TOTP de 6 dígitos.

**Body:**
```json
{
  "secret": "JBSWY3DPEHPK3PXP"
}
```

**Resposta:**
```json
{
  "success": true,
  "code": "123456",
  "timeRemaining": 25,
  "expiresAt": "2024-02-16T15:30:45.000Z"
}
```

#### POST `/api/totp/validate`
Valida um código TOTP.

**Body:**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "code": "123456"
}
```

**Resposta:**
```json
{
  "success": true,
  "valid": true
}
```

### Endpoints de E-mail Temporário

#### POST `/api/tempmail/create`
Cria uma nova conta de e-mail temporário.

**Resposta:**
```json
{
  "success": true,
  "email": "random123@mail.tm",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### GET `/api/tempmail/messages/:token`
Lista mensagens da caixa de entrada.

**Resposta:**
```json
{
  "success": true,
  "count": 2,
  "messages": [
    {
      "id": "msg123",
      "from": { "address": "noreply@roblox.com" },
      "subject": "Verify your email",
      "intro": "Click the link to verify...",
      "createdAt": "2024-02-16T15:30:00.000Z"
    }
  ]
}
```

#### GET `/api/tempmail/message/:token/:messageId`
Obtém detalhes de uma mensagem específica.

**Resposta:**
```json
{
  "success": true,
  "message": {
    "id": "msg123",
    "from": { "address": "noreply@roblox.com" },
    "subject": "Verify your email",
    "text": "Your code is 123456",
    "code": "123456",
    "verifyLink": "https://roblox.com/verify?token=...",
    "revertLink": null
  }
}
```

#### POST `/api/tempmail/wait`
Aguarda recebimento de mensagem com código/link (máx. 2 minutos).

**Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "timeout": 120000
}
```

### Endpoints de Configuração

#### POST `/api/config/save`
Salva configurações do usuário.

**Body:**
```json
{
  "userId": "user123",
  "config": {
    "email": "user@example.com",
    "currentPassword": "senha123",
    "newPassword": "novaSenha456",
    "totpSecret": "JBSWY3DPEHPK3PXP"
  }
}
```

#### GET `/api/config/:userId`
Obtém configurações salvas.

#### DELETE `/api/config/:userId`
Remove configurações do usuário.

### Endpoints de Automação Robux

#### POST `/api/robux/update`
Inicia processo de atualização de GamePass.

**Body:**
```json
{
  "cookie": ".ROBLOSECURITY=...",
  "value": "100",
  "gameId": "1234567890",
  "passId": "9876543210"
}
```

**Resposta:**
```json
{
  "success": true,
  "automationId": "automation_1708095000000",
  "message": "Automação iniciada",
  "salesUrl": "https://create.roblox.com/dashboard/..."
}
```

#### GET `/api/robux/status/:automationId`
Verifica status de uma automação.

#### POST `/api/robux/complete/:automationId`
Marca automação como concluída.

### Endpoints de Informação

#### GET `/api/health`
Verifica saúde da API.

**Resposta:**
```json
{
  "success": true,
  "status": "online",
  "version": "3.5.0",
  "timestamp": "2024-02-16T15:30:00.000Z"
}
```

#### GET `/api/docs`
Retorna documentação completa em JSON.

## 🔒 Segurança

- A API usa armazenamento em memória para dados temporários
- Para produção, recomenda-se implementar um banco de dados
- Cookies e tokens são armazenados de forma temporária
- CORS habilitado para permitir requisições de qualquer origem

## 🎨 Interface Web

A interface web está disponível na raiz (`/`) e inclui:

- **Tab AUTH**: Geração de TOTP, criação de e-mail temporário, configurações
- **Tab ROBUX**: Automação de alteração de preços de GamePass
- **Tab DOCS**: Documentação completa dos endpoints

## 📝 Exemplos de Uso

### Usando cURL

```bash
# Gerar código TOTP
curl -X POST http://localhost:3000/api/totp/generate \
  -H "Content-Type: application/json" \
  -d '{"secret":"JBSWY3DPEHPK3PXP"}'

# Criar e-mail temporário
curl -X POST http://localhost:3000/api/tempmail/create

# Verificar saúde da API
curl http://localhost:3000/api/health
```

### Usando JavaScript (Fetch)

```javascript
// Gerar código TOTP
const response = await fetch('http://localhost:3000/api/totp/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ secret: 'JBSWY3DPEHPK3PXP' })
});
const data = await response.json();
console.log(data.code); // 123456
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer fork do projeto
2. Criar uma branch para sua feature (`git checkout -b feature/NovaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/NovaFeature`)
5. Abrir um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 🔗 Links Úteis

- [Discord Community](https://discord.gg/nexusbeams)
- [Render Documentation](https://render.com/docs)
- [Express.js Documentation](https://expressjs.com/)

## 📞 Suporte

Para suporte, entre em contato através do Discord ou abra uma issue no GitHub.

---

**Desenvolvido com ⚡ por Nexus Beams**
