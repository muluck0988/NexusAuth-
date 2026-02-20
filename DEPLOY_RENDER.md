# Guia de Deploy no Render - Nexus Beams X

1.  Crie um repositório no GitHub com os arquivos desta pasta.
2.  No [Render](https://dashboard.render.com/), crie um **Web Service**.
3.  Conecte seu repositório.
4.  Configurações automáticas:
    *   **Runtime**: Node
    *   **Build Command**: `npm install`
    *   **Start Command**: `node server.js`
5.  **Variáveis de Ambiente**:
    *   `ADMIN_KEY`: Sua chave para gerar novos tokens.
    *   `PORT`: 3000
