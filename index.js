const { decryptData } = require('./script/descriptografarDados');
const { RateLimiterMemory } = require('rate-limiter-flexible');
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
const maxAttempts = 10;
const windowMs = 100000; //3 minutos
const limiterLoginWronger = new RateLimiterMemory({
  points: maxAttempts,
  duration: windowMs,
});
async function createDecryptMiddleware(req, res, next) {
  console.log(req.headers)
  const route = req.path;
  try{
    const rateLimiterRes = await limiterLoginWronger.consume(req.headers['x-forwarded-for']);
    try {
      req.body.dados = decryptData(req.body.dados, process.env.CHAVE_CODIFICADORA.split(',')[diaAtual.getDate()]);
      req.body.dados.endereco = req.headers['x-forwarded-for']
      next();
    } catch (error) {
      console.error(`Erro na descriptografia para ${route}:`, error);
      res.status(400).json({ error: 'Erro na descriptografia dos dados' });
    }
  }catch (error) {
    return res.status(429).json({
      status: '1_EN#0003',
      msg: 'Sua conta está temporariamente bloqueada. Por favor, aguarde 3 minutos antes de tentar novamente. Isso aconteceu pois você tentou realizar muitas solicitações em pouco tempo.',
    })
  }

}
app.use(createDecryptMiddleware);

const contaRegistro = require('./api/contaRegistro');
app.use('/api/contaRegistro', contaRegistro);

const PORT = process.env.PORT || 3306;
app.listen(PORT, () => console.log(`Servidor iniciado na porta ${PORT}`));
