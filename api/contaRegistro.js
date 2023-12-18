require('dotenv').config();
const bcrypt = require('bcryptjs/dist/bcrypt');
const cors = require('cors');
const createDOMPurify = require('dompurify');
const express = require('express');
var jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { EnviarEmailInicial } = require('./emais_precadatrados');
const { ErrosVerificar } = require('../gerencial/erros');
const { JSDOM } = require('jsdom');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const UserConfig = require('../models/UserConfig');
const UserBanco = require('../models/UserBanco');
const UserItems = require('../models/UserItems');
const UserInfo = require('../models/UserInfo');

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
router.post('/cadastrar',  [body('dados.endereco').trim().notEmpty().isLength({ min: 5 }).withMessage('Você não esta passando o ip para o servido'), body('dados.iv').trim().notEmpty().isLength({ min: 31 }).withMessage('IV não pode estar vazio'), body('dados.data').trim().notEmpty().withMessage('Dados criptografados não podem estar vazios'),body('dados.email').trim().isEmail().withMessage('Email inválido'), body('dados.senha').trim().isLength({ min: 6 }).withMessage('A senha deve ter pelo menos 6 caracteres'),body('dados.nome').trim().isLength({ min: 3 }).withMessage('O nome deve ter pelo menos 3 caracteres')], async (req, res) => {
  console.log("(Cadastrar) Iniciando o usuario"+ req.body.dados.email)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ msg: errors.errors[0].msg });
  }
  const sanitizedData = {
    dados: {
      nome: DOMPurify.sanitize(req.body.dados.nome),
      email: DOMPurify.sanitize(req.body.dados.email),
      senha: DOMPurify.sanitize(req.body.dados.senha),
      endereco: DOMPurify.sanitize(req.body.dados.endereco)
    }
  };
  try{
    const validarUsuario = await UserConfig.findOne({
      where: {
        email: sanitizedData.dados.email,
      },
    });
    if(!validarUsuario) {
      sanitizedData.dados.senha = await bcrypt.hash(sanitizedData.dados.senha, 8)
      sanitizedData.dados.endereco = await bcrypt.hash(sanitizedData.dados.endereco, 8)
      sanitizedData.dados.stats = '4'
      try{
        const novoUsuario = await UserConfig.create(sanitizedData.dados)
        const novoUsuarioId = novoUsuario.id
        const criarDado = async (model, msg) => {
          try {
            await model.create({ id_user: novoUsuarioId })
          } catch (error) {
            ErrosVerificar(sanitizedData.form.email, '1_EN#0004', 'EMAIL')
            console.error(`ERRO 1_EN#0004 ${msg} de ${sanitizedData.form.email}: ${error}`)
            return res.status(500).json({
              status: `1_CD#0004`,
              msg: `Não foi possivel criar o seu  ${msg}, entre em contato com nossa equipe(você pode usar a plataforma normalmente)`,
            });
          }
        }
        await criarDado(UserBanco, 'banco de dinheiro')
        await criarDado(UserInfo, 'banco de informações')
        EnviarEmailInicial(sanitizedData.dados.email, sanitizedData.dados.nome, '0000', 0)
        console.log(`(Cadastrar) Usuario ${sanitizedData.dados.email} Cadastrado`)
        return res.status(200).json({
          status: `200`,
          msg: `sucesso`,
        });
      }catch (error) {
        console.error(`ERRO 1_CD#0003 de ${sanitizedData.dados.email}: ${error}`)
        ErrosVerificar(sanitizedData.dados.email, '1_CD#0003', 'NADA')
        return res.status(500).json({
          status: `1_CD#0003`,
          msg: `Não foi possível criar o seu usuário. Por favor, tente novamente. Se o problema persistir, entre em contato com o nosso suporte.`,
        });
      }
    }
    return res.status(409).json({
      status: `1_CD#0002`,
      msg: `Erro, o email informado já está cadastrado!`,
    });
  }catch (error) {
    console.error(`ERRO 1_CD#0001 de ${sanitizedData.dados.email}: ${error}`);
    ErrosVerificar(sanitizedData.dados.email, '1_CD#0001', 'NADA')
    return res.status(500).json({
      status: '1_CD#0001',
      msg: `Não foi possível conectar ao banco de dados, tente novamente!`,
    });
  }
});

router.post('/entrar',  [body('dados.endereco').trim().notEmpty().isLength({ min: 5 }).withMessage('Você não esta passando o ip para o servido'), body('dados.iv').trim().notEmpty().isLength({ min: 31 }).withMessage('IV não pode estar vazio'), body('dados.data').trim().notEmpty().withMessage('Dados criptografados não podem estar vazios'),body('dados.email').trim().isEmail().withMessage('Email inválido'), body('dados.senha').trim().isLength({ min: 6 }).withMessage('A senha deve ter pelo menos 6 caracteres')], async (req, res) => {
  console.log("(Login) Entrando o usuario"+ req.body.dados.email)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("Erro"+errors.errors[0].msg)
    return res.status(400).json({ msg: errors.errors[0].msg });
  }
  const sanitizedData = {
    dados: {
      email: DOMPurify.sanitize(req.body.dados.email),
      senha: DOMPurify.sanitize(req.body.dados.senha),
      endereco: DOMPurify.sanitize(req.body.dados.endereco)
    }
  };
  try{
    const validarUsuario = await UserConfig.findOne({
      where: {
        email: sanitizedData.dados.email,
      },
    });
    if(validarUsuario){
      if((await bcrypt.compare(sanitizedData.dados.senha, validarUsuario.senha))){
        const diferencaData = (new Date(validarUsuario.updatedAt) - new Date()) / (1000 * 60 * 60 * 24)*(-1)
        if((validarUsuario.stats[0] == '3' || validarUsuario.stats[0] == '4') || diferencaData > 15 || ( !bcrypt.compare(sanitizedData.dados.endereco, validarUsuario.endereco) && diferencaData > 1)){
          console.log(`(Entrar) Validação do email do ${sanitizedData.dados.email}`)
          var newCodigo
          if(validarUsuario.stats[0] == '4'){
            newCodigo = Codigo(4, validarUsuario.id)
          }else{
            newCodigo = Codigo(3, validarUsuario.id)
          }
          try{
            EnviarEmailInicial(validarUsuario.email, validarUsuario.nome, newCodigo, 2)
            UserConfig.update(
              { endereco: req.ip, stats: newCodigo},
              { where: { id: validarUsuario.id} }
            )
            return res.status(200).json({
              status: `verificar`,
              id: validarUsuario.id
            });
          }catch(error){
            ErrosVerificar(sanitizedData.form.email, '1_CD#0006', 'EMAIL')
            console.error(`ERRO 1_CD#0006 de ${sanitizedData.dados.email}: ${error}`);
            return res.status(500).json({
              status: `1_EN#0006`,
              msg: `Erro de atualização, tente realizar o login novamente`,
            });
          }
        }
        if(validarUsuario.stats[0] == '2'){
          console.log(`(Entrar) O ${sanitizedData.dados.email} lembrou da senha`)
          try{
            EnviarEmailInicial(validarUsuario.email, validarUsuario.nome, '0000', 3)
            UserConfig.update(
              { stats: "0"},
              { where: { id: validarUsuario.id} }
            )
          }catch(error){
            ErrosVerificar(sanitizedData.dados.email, '1_EN#0005', 'NADA')
            console.error(`ERRO 1_EN#0005 de ${sanitizedData.dados.email}: ${error}`);
            return res.status(500).json({
              status: `1_EN#0005`,
              msg: `Erro de atualização, tente realizar o login novamente`,
            });
          }
        }
        console.log(`o ${sanitizedData.dados.email} está logado`)
        var token = jwt.sign({id: validarUsuario.id, nome: validarUsuario.nome, plano: validarUsuario.plano}, process.env.Chave_Json)
        return res.status(200).json({
          status: `200`,
          token: token,
        });
      }
      try{
        const rateLimiterRes = await limiterLoginWronger.consume(req.body.dados.email);
        return res.status(401).json({
          status: `1_EN#0004`,
          msg: `Senha incorreta. Por favor, verifique suas credenciais.`,
        });
      }catch(error){
        ErrosVerificar(sanitizedData.dados.email, '1_EN#0003', 'EMAIL')
        console.error(`ERRO 1_EN#0003 de ${sanitizedData.dados.email}: ${error}`);
        return res.status(429).json({
          status: '1_EN#0003',
          msg: 'Você excedeu o limite de tentativas de senha incorreta (mais de 3 vezes). Sua conta está temporariamente bloqueada. Por favor, aguarde 3 minutos antes de tentar novamente ou redefina sua senha.',
        });
      }
    }
    return res.status(409).json({
      status: `1_EN#0002`,
      msg: `Erro, nenhum usuario com este email encontrado`,
    });
  }catch(error){
    console.error(`ERRO 1_EN#0001 de ${sanitizedData.dados.email}: ${error}`);
    ErrosVerificar(sanitizedData.dados.email, '1_EN#0001', 'NADA')
    return res.status(500).json({
      status: '1_EN#0001',
      msg: `Não foi possível conectar ao banco de dados, tente novamente!`,
    });
  }
});
router.post('/validar', [body('dados.endereco').trim().notEmpty().isLength({ min: 5 }).withMessage('Você não esta passando o ip para o servido'),body('dados.id').trim().isNumeric().withMessage('Id errado'),body('dados.codigo.a').trim().isLength({ max: 1 }).withMessage('tem muitos digitos!'),body('dados.codigo.b').trim().isLength({ max: 1 }).withMessage('tem muitos digitos!'),body('dados.codigo.c').trim().isLength({ max: 1 }).withMessage('tem muitos digitos!'),body('dados.codigo.d').trim().isLength({ max: 1 }).withMessage('tem muitos digitos!'),body('dados.codigo.e').trim().isLength({ max: 1 }).withMessage('tem muitos digitos!'),body('dados.codigo.f').trim().isLength({ max: 1 }).withMessage('tem muitos digitos!')], async (req, res) => { 
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ msg: errors.errors[0].msg });
  }
  const sanitizedData = {
    dados: {
      a: DOMPurify.sanitize(req.body.dados.codigo.a),
      b: DOMPurify.sanitize(req.body.dados.codigo.b),
      c: DOMPurify.sanitize(req.body.dados.codigo.c),
      d: DOMPurify.sanitize(req.body.dados.codigo.d),
      e: DOMPurify.sanitize(req.body.dados.codigo.e),
      f: DOMPurify.sanitize(req.body.dados.codigo.f),
    },
    id: DOMPurify.sanitize(req.body.dados.id)
  };
  try{
    const validarUsuario = await UserConfig.findOne({
      where: {
        id: sanitizedData.id,
      }
    });
    if(validarUsuario){
      if(validarUsuario.stats[0] == 3 || validarUsuario.stats[0] == 4){
        const codParaValidar = validarUsuario.stats.split('&')[2].toString().toUpperCase()
        const codDigitado = sanitizedData.dados.a+sanitizedData.dados.b+sanitizedData.dados.c+sanitizedData.dados.d+sanitizedData.dados.e+sanitizedData.dados.f
        if(codParaValidar == codDigitado.toString().toUpperCase()){
          try{
            UserConfig.update(
              { stats: `${validarUsuario.stats[0] == 3 ? '0' : '5'}` },
              { where: { id: validarUsuario.id} }
            )
            var token = jwt.sign({id: validarUsuario.id, nome: validarUsuario.nome, plano: validarUsuario.plano}, process.env.Chave_Json)
            console.log(`o ${sanitizedData.email} está validado`)
            return res.status(200).json({
              status: `200`,
              msg: `sucesso`,
              token: token
            });
          }catch(error){
            console.error(`ERRO 1_VA#0003 de ${sanitizedData.dados.email}: ${error}`);
            ErrosVerificar(sanitizedData.dados.email, '1_VA#0003', 'NADA')
            return res.status(500).json({
              status: `1_VA#0003`,
              msg: `refaça o login novamente, não conseguimos atualizar o nosso banco de dados`,
            });
          }
        }
        return res.status(409).json({
          id: validarUsuario.id,
          status: `verificar`,
          msg: `Ops, código digitado é inválido. Por favor, verifique se há erros ou refaça o login.`,
        });
      }
      var token = jwt.sign({id: validarUsuario.id, nome: validarUsuario.nome, plano: validarUsuario.plano}, "OD2DS8S21DSA4SD4SS3A")
      console.log(`o ${sanitizedData.email} está validado`)
      return res.status(200).json({
        status: `200`,
        msg: `sucesso`,
        token: token
      });
    }
    return res.status(409).json({
      status: `1_VA#0002`,
      msg: `Erro, nenhum usuario com este email encontrado`,
    });
  }catch(error){
    console.error(`ERRO 1_VA#0001 de ${sanitizedData.dados.email}: ${error}`);
    ErrosVerificar(sanitizedData.dados.email, '1_VA#0001', 'NADA')
    return res.status(500).json({
      status: '1_VA#0001',
      msg: `Não foi possível conectar ao banco de dados, tente novamente!`,
    });
  }
});
router.post('/recuperar-senha', [body('dados.endereco').trim().notEmpty().isLength({ min: 5 }).withMessage('Você não esta passando o ip para o servido'),body('dados.email').trim().isEmail().withMessage('Email inválido')], async (req, res) => { 
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ msg: errors.errors[0].msg });
  }
  const sanitizedData = {
    dados: {
      email: DOMPurify.sanitize(req.body.dados.email),
    }
  };
  try{
    const validarUsuario = await UserConfig.findOne({
      where: {
        email: sanitizedData.dados.email,
      }
    });
    if(validarUsuario){
      const codigoEmail = Codigo(2, validarUsuario.id)
      for(var i = 0; i < 3; i++){
        try{
          EnviarEmailInicial(validarUsuario.email, validarUsuario.nome, codigoEmail, 1)
          UserConfig.update(
            { stats: codigoEmail },
            { where: { id: validarUsuario.id} }
          )
          console.log(`o ${validarUsuario.email} recebeu o email da senha`)
          return res.status(200).json({
            status: `200`,
            msg: `email enviado`,
          });
        }catch(error){
          if (i === 2) {
            console.error(`ERRO 1_RS#0003 de ${sanitizedData.dados.email}: ${error}`);
            ErrosVerificar(sanitizedData.dados.email, '1_RS#0003', 'NADA')
            return res.status(500).json({
              status: ``,
              msg: `Não conseguimos realizar esta operação, tenta mais tarde`,
            });
          }
        }
      }
    }
    return res.status(409).json({
      status: `1_RS#0002`,
      msg: `Erro, nenhum usuario com este email encontrado`,
    });
  }catch(error){
    console.error(`ERRO 1_RS#0001 de ${sanitizedData.dados.email}: ${error}`);
    ErrosVerificar(sanitizedData.dados.email, '1_RS#0001', 'NADA')
    return res.status(500).json({
      status: '1_RS#0001',
      msg: `Não foi possível conectar ao banco de dados, tente novamente!`,
    });
  }
});
router.post('/nova-senha', [body('dados.endereco').trim().notEmpty().isLength({ min: 5 }).withMessage('Você não esta passando o ip para o servido'),body('dados.cod').trim().isLength({ min: 14 }).withMessage('O codigo está invalido'),body('dados.senha').trim().isLength({ min: 6 }).withMessage('A senha deve ter pelo menos 6 caracteres')], async (req, res) => { 
  console.log(req.body)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ msg: errors.errors[0].msg });
  }
  const codLink = req.body.dados.cod.split('%26')
  if(codLink[0] != 2){
    return res.json({
      erro: `1_NS#0006`,
      msg: `Link errado, tente pedir um novo link!`,
    });
  }
  const sanitizedData = {
    senha: DOMPurify.sanitize(req.body.dados.senha),
    id: DOMPurify.sanitize(codLink[1]),
  };
  try{
    const validarUsuario = await UserConfig.findOne({
      where: {
        id: sanitizedData.id,
      }
    });
    if(validarUsuario){
      if(validarUsuario.stats[0] == 2){
        if(validarUsuario.stats == `${codLink[0]}&${codLink[1]}&${codLink[2]}`){
          const novaSenha = req.body.senha = await bcrypt.hash(sanitizedData.senha, 8);
          try{
            UserConfig.update(
              { stats: '0', senha: novaSenha },
              { where: { id: validarUsuario.id} }
            )
            return res.json({
              status: `200`,
              msg: `sucesso`,
            });
          }catch(error){
            console.error(`ERRO 1_RS#0005 de ${validarUsuario.email}: ${error}`);
            ErrosVerificar(validarUsuario.email, '1_RS#0005', 'NADA')
            return res.status(500).json({
              status: `1_RS#0005`,
              msg: `refaça o login novamente, não conseguimos atualizar o nosso banco de dados`,
            });
          }
        }
        return res.status(409).json({
          status: `1_NS#0004`,
          msg: `ops, codigo invalido`,
        });
      }
      return res.status(409).json({
        status: `1_NS#0003`,
        msg: `ops, parece que você não pediu para recuperar a senha, provavelmente este link esta incorreto =/`,
      });
    }
    return res.status(409).json({
      status: `1_NS#0002`,
      msg: `Erro, nenhum usuario encontrado`,
    });
  }catch(error){
    console.error(`ERRO 1_NS#0001`);
    return res.status(500).json({
      status: '1_NS#0001',
      msg: `Não foi possível conectar ao banco de dados, tente novamente!`,
    });
  }
});
module.exports = router;