require('dotenv').config();
const crypto = require('crypto');
function encryptData(data) {
  const diaAtual = new Date();
  const key = Buffer.from(process.env.CHAVE_CODIFICADORA.split(',')[diaAtual.getDate()], 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  let encryptedData = cipher.update(data, 'utf-8', 'hex');
  encryptedData += cipher.final('hex');
  return {
    iv: iv.toString('hex'),
    data: encryptedData,
  };
}
module.exports = {
  encryptData,
};