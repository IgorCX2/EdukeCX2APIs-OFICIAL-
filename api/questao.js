const { Op } = require("sequelize");
const helmet = require('helmet');
const express = require("express");
const cors = require('cors');
Conteudo = require('../models/Conteudo');
Questoes_Informacoes = require('../models/QuestoesInfo');
Questoes_Texto = require('../models/QuestoesTexto');
Plano_estudos = require('../models/PlanodeEstudos');
UserInfo = require('../models/UserInfos');
Conteudo = require('../models/Conteudo');
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
router.get('/get-questao', async (req, res) => {
    console.log(req.query.idQuestao)
    const segurancaNumero =  /^\d+$/
    if(segurancaNumero.test(req.query.idQuestao)){
        const buscarquestoestexto = await Questoes_Texto.findOne({
            where: {
                id: req.query.idQuestao
            },
            attributes: ['texto', 'enunciado', 'alternativas']
        })
        return res.json({
            texto: `${buscarquestoestexto.texto != 'null' ? buscarquestoestexto.texto : 'N.D.A'}`,
            pergunta: buscarquestoestexto.enunciado,
            alternativas: buscarquestoestexto.alternativas,
        });
    }
    return res.json({
        msg: 'erro',
    });
});
module.exports = router;