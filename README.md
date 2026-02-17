# Nexus Beams X - API de Automação

Esta é a API de backend para a extensão **Nexus Beams X**. Ela gerencia a lógica de 2FA (TOTP) e o monitoramento de e-mails temporários, protegendo o código de negócio contra cópias não autorizadas.

## 🚀 Deploy no Render

1. Crie um novo repositório no seu GitHub.
2. Suba estes arquivos fonte.
3. No [Render.com](https://render.com), clique em **New > Web Service**.
4. Conecte este repositório.
5. O Render detectará automaticamente as configurações através do arquivo `render.yaml` incluído.
6. Após o deploy, copie a URL gerada (ex: `https://nexus-auth-api.onrender.com`).
7. Atualize a URL base na sua extensão se necessário.

## 🛠️ Tecnologias
- Node.js
- Express
- Axios
- Otplib

## 📂 Estrutura
- `server.js`: Servidor principal e endpoints.
- `tempmail.js`: Lógica de extração de e-mails do Mail.tm.
- `package.json`: Dependências e scripts de execução.
- `render.yaml`: Configuração de infraestrutura para o Render.
