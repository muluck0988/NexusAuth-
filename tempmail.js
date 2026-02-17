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
      const domains = await this.getDomains();
      if (!domains || domains.length === 0) {
        throw new Error('Nenhum domínio disponível');
      }
      
      const domain = domains[0].domain;
      const randomUser = Math.random().toString(36).substring(2, 12);
      const address = `${randomUser}@${domain}`;
      const password = Math.random().toString(36).substring(2, 15);

      const createResponse = await fetch(`${this.baseUrl}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password })
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.text();
        throw new Error(`Falha ao criar conta: ${errorData}`);
      }

      const tokenResponse = await fetch(`${this.baseUrl}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password })
      });

      const tokenData = await tokenResponse.json();
      
      return {
        email: address,
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
   * Obtém detalhes de uma mensagem específica e extrai o código
   */
  async getMessageDetail(token, messageId) {
    try {
      const response = await fetch(`${this.baseUrl}/messages/${messageId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Falha ao obter mensagem');
      }

      const msgDetails = await response.json();
      const contentText = msgDetails.text || '';
      const contentHtml = msgDetails.html ? msgDetails.html.join('') : '';
      const fullContent = contentText + contentHtml;
      
      const code = this.extractVerificationCode(fullContent);
      
      return {
        subject: msgDetails.subject,
        code: code,
        text: contentText
      };
    } catch (error) {
      console.error('Erro ao obter mensagem:', error);
      throw error;
    }
  }

  /**
   * Extrai código de verificação de 6 dígitos
   */
  extractVerificationCode(messageContent) {
    const codeMatch = messageContent.match(/\b(\d{3}\s?\d{3})\b/);
    if (codeMatch) {
      return codeMatch[0].replace(/\s/g, '');
    }
    return null;
  }
}
