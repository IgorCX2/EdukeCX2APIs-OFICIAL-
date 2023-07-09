const { body, validationResult } = require('express-validator');
const { Op } = require("sequelize");
const helmet = require('helmet');
const express = require("express");
var jwt = require('jsonwebtoken');
const cors = require('cors');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const nodemailer = require("nodemailer");
UserConfig = require('../models/UserConfig')
UserInfo = require('../models/UserInfos');
const bcrypt = require("bcryptjs/dist/bcrypt");
const entradasApi = ['http://localhost:3000'];
const router = express.Router();
router.use(express.urlencoded({ extended: true}))
router.use(express.json());
router.use(helmet());
router.use(cors({
    origin: function (origin, callback) {
        console.log(origin)
      if (entradasApi.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Acesso negado pela política!'));
      }
    }
}));
router.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
    res.header("Access-Control-Allow-Headers", "X-PINGOTHER, Content-Type, Authorization");
    res.header("x-forwarded-for", "*")
    router.use(cors());
    next();
});
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "edukecx2@gmail.com",
      pass: "ovymmnxoprslxmfv",
    },
    tls: {
      rejectUnauthorized: false,
    },
});
async function EnviarEmail(email, usuario, cod, tipo) {
    const text = ['Seja bem-vindo à plataforma EdukeCX2! Estamos muito felizes em tê-lo(a) conosco. Como uma plataforma de estudos inovadora, nossa missão é ajudá-lo(a) a alcançar seus objetivos educacionais de forma eficiente e personalizada. Caso tenha duvidas, não hesite em perguntar para a nossa equipe','Ficamos sabendo que você perdeu/esqueceu a senha de nossa plataforma =( Não fique triste, eu mesmo vivo esquecendo as senhas, isso é normal =).Para resolvemos este problema é simples, basta clicar no botão abaixo, e colocar a sua nova senha! Viu como é fácil?', `${cod.split('&')[2]}.Você acaba de receber o número de validação de login, agora é só digitar este número no campo de validação`, 'Percebemos que você solicitou uma recuperação de senha, mas parece que você acabou de acessar a plataforma sem concluir o processo de recuperação. Se você se lembrou da sua senha, tudo bem. Caso contrário, se você não foi você quem acessou, por favor, envie um e-mail para o nosso suporte para que possamos ajudá-lo(a) a garantir a segurança da sua conta']
    const assunto = ['Boas Vindas ao EDUKE!!','Recuperação de senha','Validar Login','Relembrou a senha?']
    const mailSent = await transporter.sendMail({
      text: text[tipo],
      subject: assunto[tipo],
      from: "Equipe CX2 <edukecx2@gmail.com",
      to: email,
      html: `
      <html>
        <body style="background-color: #F5F5F5; padding: 20px;">
            <table width="600" border="0" cellpadding="1px" cellspacing="0" align="center" style="background-color: #FFFFFF; border-radius: 10px; padding: 10px 50px 20px 50px; margin-top: 50px;">
                <tr>
                    <th><img style="margin-top: 10px; margin-bottom: 20px;" height="100px" src="https://cdn.discordapp.com/attachments/572825603942645762/1046477794756001842/logo.png"><th>
                </tr>
                <tr>
                    <th style="font-size: 30px; font-weight: normal;">Olá, <strong>${usuario}</strong><th>
                </tr>
                <tr style="">
                    <th style="${tipo == 2 ? "letter-spacing: 10px; font-size: 32px; text-align: center; color:#3B82F6; text-transform: uppercase;" : "font-size: 18px; text-align: left;"}  font-weight: normal; padding-top: 40px; ">${text[tipo].split('.')[0]}<th>
                </tr>
                <tr>
                    <th style="font-size: 18px; font-weight: normal; padding-top: 30px; padding-bottom: 40px; text-align: left;">${text[tipo].split('.')[1]}<th>
                </tr>
                <tr style="${tipo == 0 || tipo == 3  ? "" : "display:none"}">
                    <th style="font-size: 18px; font-weight: normal; padding-top: 30px; padding-bottom: 40px; text-align: left;">${text[tipo].split('.')[2]}<th>
                </tr>
                <tr style="${tipo == 2 || tipo == 0 || tipo == 3 ? "display:none" : ""}">
                    <th><a href="http://localhost:3000/conta/${tipo == "1" ? "recuperar" : "validar"}/${cod}" style="text-decoration: none; color: #FFFFFF; background-color: #3B82F6; padding: 10px 40px 10px 40px; border-radius: 10px;">${tipo == "1" ? "TROCAR SENHA":"VALIDAR EMAIL"}</a><th>
                </tr>
                <tr style="${tipo == 2 || tipo == 0 || tipo == 3 ? "display:none" : ""}">
                    <th style="padding-top: 20px"><a href="http://localhost:3000/conta/${tipo == "1" ? "recuperar" : "validar"}/${cod}" style="text-decoration: none; text-align: center; ">http://localhost:3000/conta/${tipo == "1" ? "recuperar" : "validar"}/${cod}</a><th>
                </tr>
                <tr>
                    <th style="padding-top: 40px; font-weight: normal">${tipo == "1" ? "caso você não solicitou a troca de senha, recomendamos que mude a sua senha imediatamente" : "caso não seja você ignore esta mensagem"}<th>
                </tr>
            </table>
        </body>
      </html>
      `,
    });
}
function Codigo(tipo, user){
    var stringCodigo = `${tipo}&${user}&`;
    const tamanhos = [8,6,6]
    var caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for(var i = 0; i < tamanhos[Number(tipo)-1]; i++){
      stringCodigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return(stringCodigo)
}
const maxAttempts = 10;
const windowMs = 30 * 60 * 1000;

const limiter = new RateLimiterMemory({
    points: maxAttempts,
    duration: windowMs,
});
router.post('/logar-usuario', [body('form.email').trim().isEmail().withMessage('Email inválido'),body('form.senha').trim().isLength({ min: 6 }).withMessage('A senha deve ter pelo menos 6 caracteres')], async (req, res) => {
    try{
        const clientIp = req.ip;
        const rateLimiterRes = await limiter.consume(clientIp);
        console.log(req.body)
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ msg: errors.errors[0].msg });
        }
        const validarUsuario = await UserConfig.findOne({
            where: {
                email: req.body.form.email,
            }
        });
        if(validarUsuario){
            if((await bcrypt.compare(req.body.form.senha, validarUsuario.senha))){
                const diferencaData = (validarUsuario.updatedAt - new Date()) / (1000 * 60 * 60 * 24)*(-1)
                if((validarUsuario.stats[0] == '3') || (validarUsuario.endereco != req.ip && (diferencaData < 1 || diferencaData > 30))){
                    const newCodigo = Codigo(3, validarUsuario.id)
                    try{
                        UserConfig.update(
                            { endereco: req.ip, stats: newCodigo},
                            { where: { id: validarUsuario.id} }
                        )
                    }catch(error){
                        return res.json({
                            status: `1_BC#07203`,
                            msg: `Erro de atualização, tente realizar o login novamente`,
                        });
                    }
                    let entradasSalvarCadastro = 0
                    while(entradasSalvarCadastro < 3){
                        try{
                            EnviarEmail(validarUsuario.email, validarUsuario.nome, newCodigo, 2)
                            break;
                        }catch(error){
                            entradasSalvarCadastro++
                        }
                    }
                    if(entradasSalvarCadastro === 3){
                        return res.json({
                            status: '1_RS#22442',
                            msg: 'Não foi possível enviar o email após ' + entradasSalvarCadastro + ' tentativas.',
                        });
                    }
                    return res.json({
                        status: '1',
                        id: validarUsuario.id
                    });
                }
                if(validarUsuario.stats[0] == '2'){
                    EnviarEmail(validarUsuario.email, validarUsuario.nome, '0000', 3)
                    try{
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
                var token = jwt.sign({id: validarUsuario.id, nome: validarUsuario.nome, plano: validarUsuario.plano}, "OD2DS8S21DSA4SD4SS3A")
                return res.json({
                    status: `0`,
                    msg: `sucesso`,
                    token: token,
                });
            }
            return res.json({
                status: `2_BL#07203`,
                msg: `Senha incorreta`,
            });
        }
        return res.json({
            status: `1_BL#21170`,
            msg: `nenhum usuário encontrado!`,
        });
    } catch (error){
        return res.status(429).json({
            msg: 'Você tentou realizar esta ação muitas vezes. Aguarde alguns minutos e tente novamente.',
            status: '3_MD#92429',
        });
    }
});
router.post('/verificar-usuario', async (req, res) => {
    try{
        const clientIp = req.ip
        const rateLimiterRes = await limiter.consume(clientIp);
        console.log(req.body)
        if(req.body.id){
            const validarUsuario = await UserConfig.findOne({
                where: {
                    id: req.body.id,
                }
            });
            if(validarUsuario){
                if(validarUsuario.stats[0] == 3){
                    const codParaValidar = validarUsuario.stats.split('&')[2].toString().toUpperCase()
                    const codDigitado = req.body.form.a+req.body.form.b+req.body.form.c+req.body.form.d+req.body.form.e+req.body.form.f
                    if(codParaValidar != codDigitado.toString().toUpperCase()){
                        return res.json({
                            id: validarUsuario.id,
                            status: `1`,
                            msg: `ops, codigo digitado invalido, tente verificar possiveis erros, ou refaça o login!`,
                        });
                    }
                    try{
                        UserConfig.update(
                            { stats: `0` },
                            { where: { id: validarUsuario.id} }
                        )
                        var token = jwt.sign({id: validarUsuario.id, nome: validarUsuario.nome, plano: validarUsuario.plano}, "OD2DS8S21DSA4SD4SS3A")
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
                    status: `1_VF#09023`,
                    msg: `esta ação esta indisponivel, tente realizar o login novamente, assim, iremos confirmar a sua identidade novamente`,
                });
            }
            return res.json({
                status: `1_VF#21170`,
                msg: `nenhum usuário encontrado!, tente realizar o login novamente`,
            });
        }
        return res.json({
            status: `1_VF#21170`,
            msg: `não foi passado nenhum usuario no formulario, tente realizar o login novamente`,
        });
    }catch(error){
        return res.status(429).json({
            msg: 'Você tentou realizar esta ação muitas vezes. Aguarde alguns minutos e tente novamente.',
            status: '3_MD#92429',
          });
    }
});
router.post('/cadastrar-usuario', [body('form.nome').trim().isLength({ min: 3 }).withMessage('O nome deve ter pelo menos 3 caracteres'),body('form.email').trim().isEmail().withMessage('Email inválido'),body('form.senha').trim().isLength({ min: 6 }).withMessage('A senha deve ter pelo menos 6 caracteres')],async (req, res) => {
    console.log('cafastar')
    try{
        const clientIp = req.ip
        const rateLimiterRes = await limiter.consume(clientIp);
        console.log(req.body)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ msg: errors.errors[0].msg });
    }
    const validarUsuario = await UserConfig.findOne({
        where: {
            email: req.body.form.email,
        }
    });
    if(!validarUsuario){
        req.body.form.senha = await bcrypt.hash(req.body.form.senha, 8)
        req.body.form.endereco = await req.ip
        req.body.form.stats = '3'
        let entradasSalvarCadastro = 0
        let entradasInfo = 0
        let entradasSkinl = 0
        var novoUsuarioId
        while(entradasSalvarCadastro < 3){
            try{
                const novoUsuario = await UserConfig.create(req.body.form)
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
    }else{
        return res.json({
            status: `1_CB#09411`,
            msg: `erro, o email já está cadastrado`,
        });
    }
    EnviarEmail(req.body.form.email,  req.body.form.nome, '0000', 0)
    return res.json({
        status: ``,
        msg: `sucesso`,
    });

    }catch(error){
        return res.status(429).json({
            msg: 'Você tentou realizar esta ação muitas vezes. Aguarde alguns minutos e tente novamente.',
            status: '3_MD#92429',
          });
    }
});
router.post('/recuperar-senha', [body('form.email').trim().isEmail().withMessage('Email inválido')], async (req, res) => {
    try{
        const clientIp = req.ip
        const rateLimiterRes = await limiter.consume(clientIp);
        const validarUsuario = await UserConfig.findOne({
            where: {
                email: req.body.form.email,
            }
        })
        if(validarUsuario){
            const codigoEmail = Codigo(2, validarUsuario.id)
            try{
                UserConfig.update(
                    { stats: codigoEmail },
                    { where: { id: validarUsuario.id} }
                )
            }catch{
                return res.json({
                    status: `1_RS#22222`,
                    msg: `Não conseguimos realizar esta operação, tenta mais tarde =(`,
                });
            }
            let entradasSalvarCadastro = 0
            while(entradasSalvarCadastro < 3){
                try{
                    EnviarEmail(validarUsuario.email, validarUsuario.nome, codigoEmail, 1)
                    break;
                }catch(error){
                    entradasSalvarCadastro++
                }
            }
            if(entradasSalvarCadastro === 3){
                return res.json({
                    status: '1_RS#22442',
                    msg: 'Não foi possível enviar o email após ' + entradasSalvarCadastro + ' tentativas.',
                });
            }
            return res.json({
                status: `0`,
                msg: `email enviado`,
            });
        }
        return res.json({
            status: `1_RS#21170`,
            msg: `nenhum usuário encontrado!`,
        });
    }catch(error){
        return res.status(429).json({
            msg: 'Você tentou realizar esta ação muitas vezes. Aguarde alguns minutos e tente novamente.',
            status: '3_MD#92429',
          });
    }
});
router.post('/nova-senha', [body('cod').trim().isLength({ min: 14 }).withMessage('O codigo está invalido'),body('senha').trim().isLength({ min: 6 }).withMessage('A senha deve ter pelo menos 6 caracteres')], async (req, res) => {
    try{
        const clientIp = req.ip
        const rateLimiterRes = await limiter.consume(clientIp);
        console.log(req.body)
        const codLink = req.body.cod.split('%26')
        if(codLink[0] != 2){
            return res.json({
                erro: `2_NS#12233`,
                msg: `Link errado, tente pedir um novo link!`,
            });
        }
        const validarUsuario = await UserConfig.findOne({
            where: {
                id: codLink[1]
            }
        })
        if(validarUsuario){
            if(validarUsuario.stats[0] == 2){
                if(validarUsuario.stats == `${codLink[0]}&${codLink[1]}&${codLink[2]}`){
                    req.body.senha = await bcrypt.hash(req.body.senha, 8);
                    try{
                        UserConfig.update(
                            { stats: '0', senha: req.body.senha },
                            { where: { id: validarUsuario.id} }
                        )
                    }catch{
                        return res.json({
                            status: `1_RS#21544`,
                            msg: `tivemos um problema ao atualizar o banco de dados!`,
                        });
                    }
                    return res.json({
                        status: `0`,
                        msg: `sucesso`,
                    });
                }
                return res.json({
                    status: `1_RS#21174`,
                    msg: `link expirado, tente pedir um novo link!`,
                });
            }
            return res.json({
                status: `1_NS#1612`,
                msg: `ops, parece que você não pediu para recuperar a senha, provavelmente este link esta incorreto =/`,
            });
        }
        return res.json({
            status: `1_NS#21170`,
            msg: `nenhum usuário encontrado!`,
        });
    }catch(error){
        return res.status(429).json({
            msg: 'Você tentou realizar esta ação muitas vezes. Aguarde alguns minutos e tente novamente.',
            status: '3_MD#92429',
          });
    }
});
module.exports = router;