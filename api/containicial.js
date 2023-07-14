const { body, validationResult } = require('express-validator');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const createDOMPurify = require('dompurify');
var jwt = require('jsonwebtoken');
const { JSDOM } = require('jsdom');
const express = require("express");
const cors = require('cors');
const bcrypt = require("bcryptjs/dist/bcrypt");
UserConfig = require('../models/UserConfig')
UserInfo = require('../models/UserInfos');
const { EnviarEmailInicial } = require('./emailsfunctions')
const router = express.Router();
router.use(express.urlencoded({ extended: true}))
router.use(express.json());
router.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
    res.header("Access-Control-Allow-Headers", "X-PINGOTHER, Content-Type, Authorization");
    res.header("x-forwarded-for", "*")
    router.use(cors());
    next();
});
const maxAttempts = 8;
const windowMs = 30 * 60 * 1000;
const limiter = new RateLimiterMemory({
  points: maxAttempts,
  duration: windowMs,
});
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
function Codigo(tipo, user){
    var stringCodigo = `${tipo}&${user}&`;
    const tamanhos = [8,6,6,6]
    var caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for(var i = 0; i < tamanhos[Number(tipo)-1]; i++){
      stringCodigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return(stringCodigo)
}
router.post('/cadastrar', [body('form.nome').trim().isLength({ min: 3 }).withMessage('O nome deve ter pelo menos 3 caracteres'),body('form.email').trim().isEmail().withMessage('Email inválido'),body('form.senha').trim().isLength({ min: 6 }).withMessage('A senha deve ter pelo menos 6 caracteres')], async (req, res) => { 
    try{
        const clientIp = req.ip
        const rateLimiterRes = await limiter.consume(clientIp);
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ msg: errors.errors[0].msg });
        }
        const sanitizedData = {
            form: {
                nome: DOMPurify.sanitize(req.body.form.nome),
                email: DOMPurify.sanitize(req.body.form.email),
                senha: DOMPurify.sanitize(req.body.form.senha)
            }
        };
        console.log(sanitizedData)
        const validarUsuario = await UserConfig.findOne({
            where: {
                email: sanitizedData.form.email,
            }
        });
        if(!validarUsuario){
            sanitizedData.form.senha = await bcrypt.hash(sanitizedData.form.senha, 8)
            sanitizedData.form.endereco = await req.ip
            sanitizedData.form.stats = '4'
            let entradasSalvarCadastro = 0
            let entradasInfo = 0
            var novoUsuarioId
            while(entradasSalvarCadastro < 3){
                try{
                    const novoUsuario = await UserConfig.create(sanitizedData.form)
                    novoUsuarioId = novoUsuario.id
                    break;
                }catch(error){
                    entradasSalvarCadastro++
                }
            }
            while(entradasInfo < 3){
                try{
                    const novoUsuarioInfo = await UserInfo.create({id_user: novoUsuarioId})
                    break;
                }catch(error){
                    entradasSalvarCadastro++
                }
            }
            if(entradasInfo === 3){
                return res.json({
                    status: `1_CB#15560`,
                    msg: 'Conseguimos criar o seu login, porem não conseguimos criar as suas informações, entre em contato com o suporte =)',
                });
            }
            if(entradasSalvarCadastro === 3){
                return res.json({
                    status: '1_CB#28042',
                    msg: 'Não foi possível criar a tabela após ' + entradasSalvarCadastro + ' tentativas. Tente realizar o cadastro novamente',
                });
            }
            EnviarEmailInicial(sanitizedData.form.email,  sanitizedData.form.nome, '0000', 0)
            console.log(`Usuario ${sanitizedData.form.email} Cadastrado`)
            return res.json({
                status: ``,
                msg: `sucesso`,
            });
        }
        return res.json({
            status: `1_CB#09411`,
            msg: `erro, o email já está cadastrado`,
        });
    }catch (error) {
        return res.status(429).json({
          msg: 'Você tentou realizar esta ação muitas vezes. Aguarde alguns minutos e tente novamente.',
          status: '3_MD#92429',
        });
    }
});
router.post('/logar', [body('form.email').trim().isEmail().withMessage('Email inválido'),body('form.senha').trim().isLength({ min: 6 }).withMessage('A senha deve ter pelo menos 6 caracteres')], async (req, res) => { 
    try{
        const clientIp = req.ip
        const rateLimiterRes = await limiter.consume(clientIp);
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ msg: errors.errors[0].msg });
        }
        const sanitizedData = {
            form: {
                email: DOMPurify.sanitize(req.body.form.email),
                senha: DOMPurify.sanitize(req.body.form.senha)
            }
        };
        const validarUsuario = await UserConfig.findOne({
            where: {
                email: sanitizedData.form.email,
            }
        });
        if(validarUsuario){
            if((await bcrypt.compare(sanitizedData.form.senha, validarUsuario.senha))){
                const diferencaData = (validarUsuario.updatedAt - new Date()) / (1000 * 60 * 60 * 24)*(-1)
                if((validarUsuario.stats[0] == '3' || validarUsuario.stats[0] == '4') || (validarUsuario.endereco != req.ip && (diferencaData < 1 || diferencaData > 30))){
                    console.log(`validação do email do ${sanitizedData.form.email}`)
                    var newCodigo
                    if(validarUsuario.stats[0] == '4'){
                        newCodigo = Codigo(4, validarUsuario.id)
                    }else{
                        newCodigo = Codigo(3, validarUsuario.id)
                    }
                    let entradasSalvarStatus = 0
                    while(entradasSalvarStatus < 3){
                        try{
                            EnviarEmailInicial(validarUsuario.email, validarUsuario.nome, newCodigo, 2)
                            UserConfig.update(
                                { endereco: req.ip, stats: newCodigo},
                                { where: { id: validarUsuario.id} }
                            )
                            break;
                        }catch(error){
                            entradasSalvarStatus++
                        }
                    }
                    if(entradasSalvarStatus === 3){
                        return res.json({
                            status: `1_BC#07203`,
                            msg: `Erro de atualização, tente realizar o login novamente`,
                        });
                    }
                    return res.json({
                        status: '1',
                        id: validarUsuario.id
                    });
                }
                if(validarUsuario.stats[0] == '2'){
                    console.log(`o ${sanitizedData.form.email} lembrou da senha`)
                    try{
                        EnviarEmailInicial(validarUsuario.email, validarUsuario.nome, '0000', 3)
                        UserConfig.update(
                            { stats: "0"},
                            { where: { id: validarUsuario.id} }
                        )
                    }catch{
                        return res.json({
                            status: `1_BC#07203`,
                            msg: `Erro de atualização, tente realizar o login novamente`,
                        });
                    }
                }
                console.log(`o ${sanitizedData.form.email} está logado`)
                var token = jwt.sign({id: validarUsuario.id, nome: validarUsuario.nome, plano: validarUsuario.plano}, "OD2DS8S21DSA4SD4SS3A")
                return res.json({
                    status: `0`,
                    msg: `sucesso`,
                    token: token,
                });
            }else{
                return res.json({
                    status: `2_BL#07203`,
                    msg: `Senha incorreta`,
                });
            }
        }
        return res.json({
            status: `1_BL#21170`,
            msg: `nenhum usuário encontrado!`,
        });
    }catch (error) {
        return res.status(429).json({
          msg: 'Você tentou realizar esta ação muitas vezes. Aguarde alguns minutos e tente novamente.',
          status: '3_MD#92429',
        });
    }
});
router.post('/validar', [body('id').trim().isNumeric().withMessage('Id errado'),body('form.a').trim().isLength({ max: 1 }).withMessage('tem muitos digitos!'),body('form.b').trim().isLength({ max: 1 }).withMessage('tem muitos digitos!'),body('form.c').trim().isLength({ max: 1 }).withMessage('tem muitos digitos!'),body('form.d').trim().isLength({ max: 1 }).withMessage('tem muitos digitos!'),body('form.e').trim().isLength({ max: 1 }).withMessage('tem muitos digitos!'),body('form.f').trim().isLength({ max: 1 }).withMessage('tem muitos digitos!')], async (req, res) => { 
    try{
        const clientIp = req.ip
        const rateLimiterRes = await limiter.consume(clientIp);
        const sanitizedData = {
            form: {
                a: DOMPurify.sanitize(req.body.form.a),
                b: DOMPurify.sanitize(req.body.form.b),
                c: DOMPurify.sanitize(req.body.form.c),
                d: DOMPurify.sanitize(req.body.form.d),
                e: DOMPurify.sanitize(req.body.form.e),
                f: DOMPurify.sanitize(req.body.form.f),
            },
            id: DOMPurify.sanitize(req.body.id)
        };
        const validarUsuario = await UserConfig.findOne({
            where: {
                id: sanitizedData.id,
            }
        });
        if(validarUsuario){
            if(validarUsuario.stats[0] == 3 || validarUsuario.stats[0] == 4){
                const codParaValidar = validarUsuario.stats.split('&')[2].toString().toUpperCase()
                const codDigitado = sanitizedData.form.a+sanitizedData.form.b+sanitizedData.form.c+sanitizedData.form.d+sanitizedData.form.e+sanitizedData.form.f
                if(codParaValidar == codDigitado.toString().toUpperCase()){
                    try{
                        UserConfig.update(
                            { stats: `${validarUsuario.stats[0] == 3 ? '0' : '5'}` },
                            { where: { id: validarUsuario.id} }
                        )
                        var token = jwt.sign({id: validarUsuario.id, nome: validarUsuario.nome, plano: validarUsuario.plano}, "OD2DS8S21DSA4SD4SS3A")
                        console.log(`o ${sanitizedData.form.email} está validado`)
                        return res.json({
                            status: `0`,
                            msg: `sucesso`,
                            token: token
                        });
                    }catch(error){
                        return res.json({
                            status: `1_VF#12255`,
                            msg: `refaça o login novamente, não conseguimos atualizar o nosso banco de dados`,
                        });
                    }
                }
                return res.json({
                    id: validarUsuario.id,
                    status: `1`,
                    msg: `ops, codigo digitado invalido, tente verificar possiveis erros, ou refaça o login!`,
                });
            }
        }
        return res.json({
            status: `1_BL#21170`,
            msg: `nenhum usuário encontrado!`,
        });
    }catch (error) {
        return res.status(429).json({
          msg: 'Você tentou realizar esta ação muitas vezes. Aguarde alguns minutos e tente novamente.',
          status: '3_MD#92429',
        });
    }
});
module.exports = router;