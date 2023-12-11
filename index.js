const { decryptData } = require('./script/descriptografarDados');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const diaAtual = new Date();
const app = express();
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const whitelist = ['http://localhost:3000', 'http://aprendacomeduke.com.br', undefined, 'http://localhost:8080'];
app.use(
  cors({
    origin: function (origin, callback) {
      if (whitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log(origin)
        callback(new Error('Acesso negado pela política!'));
      }
    },
  })
);
function createDecryptMiddleware(req, res, next) {
  const route = req.path;
  try {
    req.body.dados = decryptData(req.body.dados, process.env.CHAVE_CODIFICADORA.split(',')[diaAtual.getDate()]);
    next();
  } catch (error) {
    console.error(`Erro na descriptografia para ${route}:`, error);
    res.status(400).json({ error: 'Erro na descriptografia dos dados' });
  }
}
app.use(createDecryptMiddleware);

const contaRegistro = require('./api/contaRegistro');
app.use('/api/contaRegistro', contaRegistro);

const PORT = process.env.PORT || 3306;
app.listen(PORT, () => console.log(`Servidor iniciado na porta ${PORT}`));
