# NEXUS BEAMS X - V3

Sistema de automação e segurança com gerenciamento de tokens, controle de IP e geolocalização.

## 🚀 Deploy no Render

1. Crie um novo **Web Service** no Render.
2. Conecte seu repositório do GitHub.
3. Configure os seguintes campos:
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. Adicione as variáveis de ambiente se necessário (o sistema usa a porta 3000 por padrão).

## 🛡️ Sistema de Segurança

- **Tokens**: Acesso restrito via tokens gerados pelo administrador.
- **IP Lock**: O token vincula-se ao IP no primeiro acesso.
- **Geolocalização**: Se o IP mudar, o acesso só é permitido em um raio de 1km do local original.
- **Admin**: Painel administrativo integrado para gerenciar tokens.

## 📁 Estrutura de Arquivos

- `server.js`: Servidor principal e lógica de API.
- `tempmail.js`: Módulo de e-mail temporário.
- `public/`: Interface web (HTML/JS).
- `data.json`: Persistência de dados (tokens e configurações).
