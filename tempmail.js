const https = require('https');

const TempMail = {
  async request(path, method = 'GET', body = null, token = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.mail.tm',
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
      }

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      });

      req.on('error', (e) => reject(e));
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  },

  async createAccount(address, password) {
    return this.request('/accounts', 'POST', { address, password });
  },

  async getToken(address, password) {
    return this.request('/token', 'POST', { address, password });
  },

  async getMessages(token) {
    return this.request('/messages', 'GET', null, token);
  },

  async getMessage(id, token) {
    return this.request(`/messages/${id}`, 'GET', null, token);
  }
};

module.exports = TempMail;
