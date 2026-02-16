import crypto from 'crypto';

/**
 * Implementação de TOTP (Time-based One-Time Password)
 */
export class TOTP {
  /**
   * Converte Base32 para Buffer
   */
  static base32ToBuf(base32) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    base32 = base32.replace(/=+$/, ''); // Remove padding
    let bits = '';
    
    for (let i = 0; i < base32.length; i++) {
      const val = alphabet.indexOf(base32[i].toUpperCase());
      if (val === -1) continue;
      bits += val.toString(2).padStart(5, '0');
    }
    
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substr(i, 8), 2));
    }
    
    return Buffer.from(bytes);
  }

  /**
   * Gera código TOTP de 6 dígitos
   */
  static generate(secretBase32) {
    try {
      const secretBuf = this.base32ToBuf(secretBase32);
      const epoch = Math.floor(Date.now() / 1000);
      const time = Math.floor(epoch / 30);
      
      // Converte tempo para buffer de 8 bytes (big-endian)
      const timeBuf = Buffer.alloc(8);
      timeBuf.writeUInt32BE(0, 0);
      timeBuf.writeUInt32BE(time, 4);

      // Gera HMAC-SHA1
      const hmac = crypto.createHmac('sha1', secretBuf);
      hmac.update(timeBuf);
      const digest = hmac.digest();
      
      // Extrai código de 6 dígitos
      const offset = digest[digest.length - 1] & 0xf;
      const code = (
        ((digest[offset] & 0x7f) << 24) |
        ((digest[offset + 1] & 0xff) << 16) |
        ((digest[offset + 2] & 0xff) << 8) |
        (digest[offset + 3] & 0xff)
      ) % 1000000;

      return code.toString().padStart(6, '0');
    } catch (e) {
      console.error('Erro ao gerar TOTP:', e);
      return null;
    }
  }

  /**
   * Calcula tempo restante até expiração do código
   */
  static getTimeRemaining() {
    const epoch = Math.floor(Date.now() / 1000);
    return 30 - (epoch % 30);
  }

  /**
   * Valida um código TOTP
   */
  static validate(secretBase32, code, window = 1) {
    const currentCode = this.generate(secretBase32);
    if (currentCode === code) return true;
    
    // Verifica janela de tempo (códigos anteriores/posteriores)
    for (let i = 1; i <= window; i++) {
      const epoch = Math.floor(Date.now() / 1000);
      const timeBuf = Buffer.alloc(8);
      
      // Código anterior
      timeBuf.writeUInt32BE(0, 0);
      timeBuf.writeUInt32BE(Math.floor(epoch / 30) - i, 4);
      const prevCode = this._generateFromTime(secretBase32, timeBuf);
      if (prevCode === code) return true;
      
      // Código posterior
      timeBuf.writeUInt32BE(Math.floor(epoch / 30) + i, 4);
      const nextCode = this._generateFromTime(secretBase32, timeBuf);
      if (nextCode === code) return true;
    }
    
    return false;
  }

  static _generateFromTime(secretBase32, timeBuf) {
    try {
      const secretBuf = this.base32ToBuf(secretBase32);
      const hmac = crypto.createHmac('sha1', secretBuf);
      hmac.update(timeBuf);
      const digest = hmac.digest();
      
      const offset = digest[digest.length - 1] & 0xf;
      const code = (
        ((digest[offset] & 0x7f) << 24) |
        ((digest[offset + 1] & 0xff) << 16) |
        ((digest[offset + 2] & 0xff) << 8) |
        (digest[offset + 3] & 0xff)
      ) % 1000000;

      return code.toString().padStart(6, '0');
    } catch (e) {
      return null;
    }
  }
}
