const helmet = require('helmet');
const express = require("express");
const cors = require('cors');
Frase = require('../models/Frase');
const entradasApi = ['http://localhost:3000'];
const router = express.Router();
router.use(express.urlencoded({ extended: true}))
router.use(express.json());
router.use(helmet());
router.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
    res.header("Access-Control-Allow-Headers", "X-PINGOTHER, Content-Type, Authorization");
    res.header("x-forwarded-for", "*")
    router.use(cors());
    next();
});
router.get('/get-frase', async (req, res) => {
    const segurancaData = req.query.dia.split('/')
    if(req.query.dia.length < 3 || req.query.dia.length > 5 || segurancaData.length != 2 || segurancaData[0].length > 2 || segurancaData[1].length > 2){
        return res.json({
            frase: "Erro ao trazer a frase do dia =("
        });
    }
    const fraseBanco = await Frase.findAll({
        where: {
            dataFrase: req.query.dia
        },
        attributes: ['frase']
    })
    if(fraseBanco.length == 0){
        return res.json({
            frase: "Não encontramos nenhuma frase para o dia de hoje, talvez você possa ser o(a) 1º a escreve-la!"
        });
    }
    const fraseAleatorio = fraseBanco[Math.floor(Math.random() * fraseBanco.length)]
    return res.json({
        frase: fraseAleatorio.frase
    });
});
module.exports = router;