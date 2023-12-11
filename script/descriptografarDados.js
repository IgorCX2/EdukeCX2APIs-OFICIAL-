const crypto = require('crypto');
function decryptData(encryptedData, cod) {
  const key = Buffer.from(cod, 'hex');
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
  let decryptedData = decipher.update(encryptedData.data, 'hex', 'utf-8');
  decryptedData += decipher.final('utf-8');
  const decryptedObject = JSON.parse(decryptedData);
  decryptedObject.iv = encryptedData.iv;
  decryptedObject.data = encryptedData.data;

  return decryptedObject;
}
module.exports = {
  decryptData,
};