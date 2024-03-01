const { decryptData } = require('./script/descriptografarDados');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const app = express();
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const whitelist = ['http://localhost:3000', 'http://aprendacomeduke.com.br', undefined, 'http://localhost:8080'];
const whitelistMiddleware = ['/api/usuariosInfos/salva-plano','/api/frases/','/api/usuariosInfos/mudar-status','/api/usuariosInfos/cad-nivel', '/api/selecionarQuestoes/diagnostico', '/api/analisarQuestoes/diagnostico'];
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
  const route = req.path;
  console.log(req.body)
  console.log(`Tipo de requisição para ${route}: ${req.method} (${req.headers['x-forwarded-for']})`);
  if(whitelistMiddleware.indexOf(route) !== -1 || req.method == "GET"){
    return next();
  }
  try{
    const rateLimiterRes = await limiterLoginWronger.consume(req.headers['x-forwarded-for']);
    try {
      req.body.dados = decryptData(req.body.dados);
      req.body.dados.endereco = "req.headers['x-forwarded-for']"
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

const analisarQuestoes = require("./api/analisarQuestoes");
app.use("/api/analisarQuestoes", analisarQuestoes);

const contaRegistro = require('./api/contaRegistro');
app.use('/api/contaRegistro', contaRegistro);

const frases = require("./api/frases");
app.use("/api/frases", frases);

const usuariosInfos = require("./api/usuariosInfos");
app.use("/api/usuariosInfos", usuariosInfos);

const selecionarQuestoes = require("./api/selecionarQuestoes");
app.use("/api/selecionarQuestoes", selecionarQuestoes);

const questoes = require("./api/questoes");
app.use("/api/questoes", questoes);

const estudarInfos = require("./api/estudar");
app.use("/api/estudar", estudarInfos);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor iniciado na porta ${PORT}`));
