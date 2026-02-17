const axios = require('axios');

async function checkMessages(token) {
    try {
        const response = await axios.get('https://api.mail.tm/messages', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const messages = response.data['hydra:member'];
        if (messages.length === 0) return { found: false };

        const msgId = messages[0].id;
        const msgRes = await axios.get(`https://api.mail.tm/messages/${msgId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const content = (msgRes.data.text || '') + (msgRes.data.html ? msgRes.data.html.join('') : '');
        
        const verifyLink = content.match(/https?:\/\/(www\.)?roblox\.com\/[^\s"'>]+verify[^\s"'>]*/i);
        const revertLink = content.match(/https?:\/\/(www\.)?roblox\.com\/[^\s"'>]+revert[^\s"'>]*/i);
        const codeMatch = content.match(/\b\d{6}\b/);

        return {
            found: true,
            subject: msgRes.data.subject,
            verifyLink: verifyLink ? verifyLink[0] : null,
            revertLink: revertLink ? revertLink[0] : null,
            code: codeMatch ? codeMatch[0] : null
        };
    } catch (err) {
        throw err;
    }
}

module.exports = { checkMessages };
