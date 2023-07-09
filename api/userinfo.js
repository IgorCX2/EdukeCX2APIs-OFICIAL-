const { body, validationResult } = require('express-validator');
const helmet = require('helmet');
const express = require("express");
const cors = require('cors');
const { rateLimit } = require("express-rate-limit");
UserInfo = require('../models/UserInfos');
const entradasApi = ['http://localhost:3000', undefined];
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
router.post('/pegar-informacoes', async (req, res) => {
    req.body.id = parseInt(req.body.id);
    if(req.body.id == NaN){
        return res.json({
            status: `2_PI#12471`,
            msg: `isso não é um ID valido`,
        });
    }
    const validarUsuario = await UserInfo.findOne({
        where: {
            id_user: req.body.id,
        }
    })
    if(validarUsuario){
        return res.json({
            status: '0',
            msg: validarUsuario,
        });
    }
    return res.json({
        status: `1_PI#12402`,
        msg: `nenhum usuário encontrado!`,
    });
});
router.post('/cad-nivel', [body('form.matematica').trim().isLength({ max: 1 }).withMessage('Erro:1_SN#1254'),body('form.portugues').trim().isLength({ max: 1 }).withMessage('Erro:1_SN#1254'),body('form.geografia').trim().isLength({ max: 1 }).withMessage('Erro:1_SN#1254'),body('form.historia').trim().isLength({ max: 1 }).withMessage('Erro:1_SN#1254'),body('form.biologia').trim().isLength({ max: 1 }).withMessage('Erro:1_SN#1254'),body('form.quimica').trim().isLength({ max: 1 }).withMessage('Erro:1_SN#1254'),body('form.fisica').trim().isLength({ max: 1 }).withMessage('Erro:1_SN#1254'),body('form.literatura').trim().isLength({ max: 1 }).withMessage('Erro:1_SN#1254'),body('form.artes').trim().isLength({ max: 1 }).withMessage('Erro:1_SN#1254'),body('form.sociologia').trim().isLength({ max: 1 }).withMessage('Erro:1_SN#1254'),body('form.filosofia').trim().isLength({ max: 1 }).withMessage('Erro:1_SN#1254')], async (req, res) => {
    try{
        UserInfo.update(
            { nivel: req.body.form.matematica+`,`+req.body.form.portugues+`,`+req.body.form.geografia+`,`+req.body.form.historia+`,`+req.body.form.biologia+`,`+req.body.form.quimica+`,`+req.body.form.fisica+`,`+req.body.form.literatura+`,`+req.body.form.artes+`,`+req.body.form.sociologia+`,`+req.body.form.filosofia},
            { where: { id_user: parseInt(req.body.id)} }
        )
    }catch(error){
        return res.json({
            status: 'Não foi possivel'
        });
    }
    return res.json({
        status: '0'
    });
});
module.exports = router;