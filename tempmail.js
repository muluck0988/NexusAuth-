import fetch from 'node-fetch';

/**
 * Gerenciador de E-mail Temporário usando Mail.tm
 */
export class TempMail {
  constructor() {
    this.baseUrl = 'https://api.mail.tm';
  }

  /**
   * Obtém lista de domínios disponíveis
   */
  async getDomains() {
    try {
      const response = await fetch(`${this.baseUrl}/domains`);
      const data = await response.json();
      return data['hydra:member'];
    } catch (error) {
      console.error('Erro ao obter domínios:', error);
      throw error;
    }
  }

  /**
   * Cria uma nova conta de e-mail temporário
   */
  async createAccount() {
    try {
      // Obtém domínio disponível
      const domains = await this.getDomains();
      if (!domains || domains.length === 0) {
        throw new Error('Nenhum domínio disponível');
      }
      
      const domain = domains[0].domain;
      const randomUser = Math.random().toString(36).substring(2, 12);
      const address = `${randomUser}@${domain}`;
      const password = Math.random().toString(36).substring(2, 15);

      // Cria conta
      const createResponse = await fetch(`${this.baseUrl}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password })
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.text();
        throw new Error(`Falha ao criar conta: ${errorData}`);
      }

      // Obtém token de autenticação
      const tokenResponse = await fetch(`${this.baseUrl}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password })
      });

      const tokenData = await tokenResponse.json();
      
      return {
        address,
        password,
        token: tokenData.token
      };
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      throw error;
    }
  }

  /**
   * Lista mensagens da caixa de entrada
   */
  async getMessages(token) {
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Falha ao obter mensagens');
      }

      const data = await response.json();
      return data['hydra:member'];
    } catch (error) {
      console.error('Erro ao obter mensagens:', error);
      throw error;
    }
  }

  /**
   * Obtém detalhes de uma mensagem específica
   */
  async getMessage(token, messageId) {
    try {
      const response = await fetch(`${this.baseUrl}/messages/${messageId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Falha ao obter mensagem');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao obter mensagem:', error);
      throw error;
    }
  }

  /**
   * Extrai código de verificação de 6 dígitos de uma mensagem
   */
  extractVerificationCode(messageContent) {
    const codeMatch = messageContent.match(/\b\d{6}\b/);
    return codeMatch ? codeMatch[0] : null;
  }

  /**
   * Extrai link de verificação Roblox
   */
  extractVerifyLink(messageContent) {
    const verifyLinkMatch = messageContent.match(/https?:\/\/(www\.)?roblox\.com\/[^\s"'>]+verify[^\s"'>]*/i);
    return verifyLinkMatch ? verifyLinkMatch[0] : null;
  }

  /**
   * Extrai link de reversão Roblox
   */
  extractRevertLink(messageContent) {
    const revertLinkMatch = messageContent.match(/https?:\/\/(www\.)?roblox\.com\/[^\s"'>]+revert[^\s"'>]*/i);
    return revertLinkMatch ? revertLinkMatch[0] : null;
  }

  /**
   * Monitora caixa de entrada e retorna primeira mensagem com código/link
   */
  async waitForMessage(token, timeout = 120000) {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(async () => {
        try {
          if (Date.now() - startTime > timeout) {
            clearInterval(checkInterval);
            reject(new Error('Timeout: nenhuma mensagem recebida'));
            return;
          }

          const messages = await this.getMessages(token);
          
          if (messages.length > 0) {
            const msg = messages[0];
            const msgDetails = await this.getMessage(token, msg.id);
            
            const contentText = msgDetails.text || '';
            const contentHtml = msgDetails.html ? msgDetails.html.join('') : '';
            const fullContent = contentText + contentHtml;
            
            const code = this.extractVerificationCode(fullContent);
            const verifyLink = this.extractVerifyLink(fullContent);
            const revertLink = this.extractRevertLink(fullContent);
            
            clearInterval(checkInterval);
            resolve({
              subject: msg.subject,
              from: msg.from,
              code,
              verifyLink,
              revertLink,
              content: contentText
            });
          }
        } catch (error) {
          console.error('Erro ao verificar mensagens:', error);
        }
      }, 3000);
    });
  }
}
