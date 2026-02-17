const axios = require('axios');

const MAIL_TM_API = 'https://api.mail.tm';

const tempMail = {
  getDomains: async () => {
    const res = await axios.get(`${MAIL_TM_API}/domains`);
    return res.data;
  },
  createAccount: async (address, password) => {
    const res = await axios.post(`${MAIL_TM_API}/accounts`, { address, password });
    return res.data;
  },
  getToken: async (address, password) => {
    const res = await axios.post(`${MAIL_TM_API}/token`, { address, password });
    return res.data;
  },
  getMessages: async (token) => {
    const res = await axios.get(`${MAIL_TM_API}/messages`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.data;
  },
  getMessage: async (token, id) => {
    const res = await axios.get(`${MAIL_TM_API}/messages/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.data;
  }
};

module.exports = tempMail;
