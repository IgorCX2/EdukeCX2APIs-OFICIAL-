require('dotenv').config();
const express = require('express');
const { body, validationResult } = require('express-validator');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
var jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcryptjs/dist/bcrypt');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const router = express.Router();
router.use(express.urlencoded({ extended: true }));
router.use(express.json());

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
  res.header('Access-Control-Allow-Headers', 'X-PINGOTHER, Content-Type, Authorization');
  res.header('x-forwarded-for', '*');
  router.use(cors());
  next();
});

const maxAttempts = 3;
const windowMs = 300000; //3 minutos
const limiterLoginWronger = new RateLimiterMemory({
  points: maxAttempts,
  duration: windowMs,
});

function Codigo(tipo, user) {
  var stringCodigo = `${tipo}&${user}&`;
  const tamanhos = [8, 6, 6, 6]
  var caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (var i = 0; i < tamanhos[Number(tipo) - 1]; i++) {
    stringCodigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return (stringCodigo)
}
router.post('/cadastrar',  [body('dados.iv').trim().notEmpty().isLength({ min: 31 }).withMessage('IV não pode estar vazio'), body('dados.data').trim().notEmpty().withMessage('Dados criptografados não podem estar vazios'),body('dados.email').trim().isEmail().withMessage('Email inválido'), body('dados.senha').trim().isLength({ min: 6 }).withMessage('A senha deve ter pelo menos 6 caracteres'),body('dados.nome').trim().isLength({ min: 3 }).withMessage('O nome deve ter pelo menos 3 caracteres')], async (req, res) => {
  console.log("(Cadastrar) Entrando o usuario"+ req.body.dados.email)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ msg: errors.errors[0].msg });
  }
});

router.post('/entrar',  [body('dados.iv').trim().notEmpty().isLength({ min: 31 }).withMessage('IV não pode estar vazio'), body('dados.data').trim().notEmpty().withMessage('Dados criptografados não podem estar vazios'),body('dados.email').trim().isEmail().withMessage('Email inválido'), body('dados.senha').trim().isLength({ min: 6 }).withMessage('A senha deve ter pelo menos 6 caracteres')], async (req, res) => {
  console.log("(Login) Entrando o usuario"+ req.body.dados.email)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ msg: errors.errors[0].msg });
  }
});

module.exports = router;