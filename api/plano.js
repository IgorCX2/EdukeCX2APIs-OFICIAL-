const { body, validationResult } = require('express-validator');
const { Op } = require("sequelize");
const helmet = require('helmet');
const express = require("express");
const cors = require('cors');
Plano_estudos = require('../models/PlanodeEstudos');
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
router.get('/get-plano', async (req, res) => {
    console.log(req.query)
    const plano = await Plano_estudos.findAll({
        where: {
            codigo_plano: req.query.id
        },
        attributes: ['plano_estudos','materia']
    })
    return res.json({
        meuPlano: plano
    });
});
module.exports = router;