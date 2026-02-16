# 🚀 Guia de Deploy no Render

Este guia mostra como fazer deploy da API Nexus Beams X no Render.

## 📋 Pré-requisitos

1. Conta no [Render](https://render.com) (gratuita)
2. Conta no [GitHub](https://github.com) (opcional, mas recomendado)

## 🎯 Método 1: Deploy via GitHub (Recomendado)

### Passo 1: Preparar o Repositório

1. Crie um novo repositório no GitHub
2. Faça upload de todos os arquivos do projeto (exceto `node_modules/`)
3. Faça commit e push:

```bash
git init
git add .
git commit -m "Initial commit - Nexus Beams X API"
git remote add origin https://github.com/seu-usuario/nexusbeams-api.git
git push -u origin main
```

### Passo 2: Conectar ao Render

1. Acesse [Render Dashboard](https://dashboard.render.com/)
2. Clique em **New +** no canto superior direito
3. Selecione **Web Service**
4. Clique em **Connect a repository**
5. Autorize o Render a acessar seu GitHub
6. Selecione o repositório `nexusbeams-api`

### Passo 3: Configurar o Serviço

Preencha os campos:

- **Name**: `nexusbeams-api` (ou nome de sua escolha)
- **Region**: Escolha a região mais próxima
- **Branch**: `main`
- **Root Directory**: (deixe em branco)
- **Environment**: `Node`
- **Build Command**: `pnpm install` ou `npm install`
- **Start Command**: `node server.js`

### Passo 4: Configurar Variáveis de Ambiente

Na seção **Environment Variables**, adicione:

```
PORT=3000
NODE_ENV=production
```

### Passo 5: Escolher Plano

- **Instance Type**: Free (ou plano de sua escolha)
- Free tier inclui:
  - 750 horas/mês
  - 512 MB RAM
  - Suspende após 15 min de inatividade

### Passo 6: Deploy

1. Clique em **Create Web Service**
2. Aguarde o deploy (geralmente 2-5 minutos)
3. Quando concluído, você verá a URL pública: `https://nexusbeams-api.onrender.com`

## 🎯 Método 2: Deploy Manual (sem GitHub)

### Passo 1: Preparar Repositório Público

1. Faça upload do código para um repositório Git público (GitHub, GitLab, Bitbucket)
2. Ou use a opção **Public Git repository** no Render

### Passo 2: Configurar no Render

1. Acesse [Render Dashboard](https://dashboard.render.com/)
2. Clique em **New +** → **Web Service**
3. Escolha **Public Git repository**
4. Cole a URL do repositório Git
5. Continue com os passos 3-6 do Método 1

## ✅ Verificar Deploy

Após o deploy, teste os endpoints:

### Health Check
```bash
curl https://seu-app.onrender.com/api/health
```

### Interface Web
Acesse no navegador:
```
https://seu-app.onrender.com
```

### Documentação
```
https://seu-app.onrender.com/api/docs
```

## 🔧 Configurações Adicionais

### Domínio Personalizado

1. No painel do Render, vá em **Settings**
2. Role até **Custom Domain**
3. Adicione seu domínio
4. Configure os registros DNS conforme instruções

### Logs

1. Acesse **Logs** no painel do Render
2. Veja logs em tempo real
3. Use para debug e monitoramento

### Auto-Deploy

O Render faz deploy automático quando você faz push para o branch configurado.

Para desabilitar:
1. Vá em **Settings**
2. Desmarque **Auto-Deploy**

### Variáveis de Ambiente

Para adicionar/editar variáveis:
1. Vá em **Environment**
2. Clique em **Add Environment Variable**
3. Salve (isso reiniciará o serviço)

## 🐛 Troubleshooting

### Erro: "Build failed"

**Solução**: Verifique se o `package.json` está correto e todas as dependências estão listadas.

### Erro: "Application failed to respond"

**Solução**: 
- Verifique se a porta está configurada corretamente
- Certifique-se de que o servidor está escutando em `0.0.0.0` (não `localhost`)
- Verifique os logs no painel do Render

### Serviço suspenso (Free tier)

**Solução**: 
- O plano gratuito suspende após 15 min de inatividade
- Primeira requisição pode levar 30-60s para "acordar"
- Para manter ativo 24/7, considere upgrade ou use serviço de ping

### Erro: "Module not found"

**Solução**: 
- Verifique se todas as dependências estão em `package.json`
- Use `pnpm install` ou `npm install` localmente para testar
- Certifique-se de que `"type": "module"` está no `package.json`

## 📊 Monitoramento

### Métricas Disponíveis

No painel do Render, você pode ver:
- CPU usage
- Memory usage
- Request count
- Response times

### Alertas

Configure alertas para:
- Deploy failures
- High memory usage
- Service downtime

## 💰 Custos

### Plano Free
- **Custo**: $0/mês
- **Limitações**: 
  - 750 horas/mês
  - Suspende após inatividade
  - 512 MB RAM

### Plano Starter
- **Custo**: $7/mês
- **Vantagens**:
  - Sempre ativo (sem suspensão)
  - 512 MB RAM
  - SSL gratuito

### Plano Standard
- **Custo**: $25/mês
- **Vantagens**:
  - 2 GB RAM
  - Melhor performance
  - Suporte prioritário

## 🔗 Links Úteis

- [Render Documentation](https://render.com/docs)
- [Render Status](https://status.render.com/)
- [Render Community](https://community.render.com/)
- [Pricing](https://render.com/pricing)

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs no painel do Render
2. Consulte a [documentação oficial](https://render.com/docs)
3. Entre em contato via [Discord Nexus Beams](https://discord.gg/nexusbeams)

---

**Boa sorte com seu deploy! 🚀**
