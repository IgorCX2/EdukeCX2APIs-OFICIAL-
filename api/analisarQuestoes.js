require('dotenv').config();
const { Op } = require("sequelize");
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


const Questoes_Informacoes = require('../models/QuestoesInfo');
const UserInfo = require('../models/UserInfo');
const Conteudo = require('../models/Conteudo')
const Plano_estudos = require('../models/PlanodeEstudos')

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

function OrganizarArray(arr, size) {
    let organizar = [];
    let count = 0
    for (let i = 0; i < arr.length; i += size) {
        let organiza = arr.slice(i, i + size);
        organizar.push(organiza);
        count++
    }
    return organizar;
}
function trasformarSegundosEmTempo(segundos) {
    var horas = Math.floor(segundos / 3600);
    var minutos = Math.floor((segundos % 3600) / 60);
    var segundo = segundos % 60;
    var tempoFormatado = horas.toString().padStart(2, '0') + ':' + minutos.toString().padStart(2, '0') + ':' + segundo.toString().padStart(2, '0');
    return tempoFormatado;
}
function traformarTempoEmSegundo(tempo){
    let[horas, minutos, segundos] = tempo.split(":")
    let totalSegundos = (+horas * 60 * 60) + (+minutos * 60) + (+segundos);
    return totalSegundos
}
function verificarTempo(questaoAvaliada,segundosFeitos){
    var tempoPonto = -1*((segundosFeitos- questaoAvaliada)/ questaoAvaliada)
    if(tempoPonto > -0.3 && tempoPonto < 0.3){
        tempoPonto = 0.4
    }
    return tempoPonto
}
function extrairCodigosUnicos(dados) {
    const codigos = new Set();
    dados.forEach(item => {
      codigos.add(item.codigo);
    });
    return Array.from(codigos);
}
function criarMapaDificuldades(dificuldades) {
    dificuldades = dificuldades[0]
    const mapaDificuldades = {};
    for (let i = 0; i < dificuldades.length; i++) {
        const par = dificuldades[i].split('=');
        mapaDificuldades[par[0]] = parseInt(par[1]);
    }
    return mapaDificuldades;
}
function organizarDados(dados){
    const organizado = {};

  dados.forEach(item => {
    const materia = item.materia.toString();
    if (!organizado[materia]) organizado[materia] = [];
    organizado[materia].push(item);
  });

  for (const materia in organizado) {
    organizado[materia].sort((a, b) => {
      if (a.nivel !== b.nivel) {
        return a.nivel - b.nivel;
      } else {
        const aDependeDeB = a.previo.includes(b.codigo.toString());
        const bDependeDeA = b.previo.includes(a.codigo.toString());
        if (aDependeDeB) return 1;
        if (bDependeDeA) return -1;
        return a.codigo - b.codigo;
      }
    });
  }
  console.log(organizado)
  const organizador = [];
  const materias = Object.keys(organizado);
  let maxElementos = 0;
  for (const materia of materias) {
    maxElementos = Math.max(maxElementos, organizado[materia].length);
  }
  for (let i = 0; i < maxElementos; i++) {
    for (const materia of materias) {
        if (organizado[materia][i]) {
            organizador.push(organizado[materia][i]);
        }
    }
  }
  console.log(organizador)
  const codigosUnicos = extrairCodigosUnicos(organizador);
  return codigosUnicos
};
function obterNivel(conteudo, mapaDificuldades) {
    return mapaDificuldades[conteudo] || null;
}
router.post('/diagnostico', [body('id').trim().isNumeric().withMessage('Id errado')], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ msg: errors.errors[0].msg });
    }
    const sanitizedData = {
        id: DOMPurify.sanitize(req.body.id)
    };
    var salvarPontoConteudo = []
    if(req.body.dadosAnalise.config.planoHistorico  == undefined ){
        req.body.dadosAnalise.config.planoHistorico = []
    }else{
        req.body.dadosAnalise.config.planoHistorico.split(',')
    }
    if(req.body.dadosAnalise.dados.historicomateria == "" || req.body.dadosAnalise.dados.historicomateria == undefined){
        req.body.dadosAnalise.dados.historicomateria = '0'
    }
    if(req.body.dadosAnalise.dados.respostasHistorico[req.body.dadosAnalise.dados.historicomateria] == undefined){
        req.body.dadosAnalise.dados.respostasHistorico[req.body.dadosAnalise.dados.historicomateria] = []
    }
    if(req.body.dadosAnalise.dados.historicoPosicao[req.body.dadosAnalise.dados.historicomateria] == undefined){
        req.body.dadosAnalise.dados.historicoPosicao[req.body.dadosAnalise.dados.historicomateria] = ['0']
    }
    var dificuldadeUser = []
    if(req.body.dadosAnalise.dados.dificuldade.length == 0){
        if(req.body.dadosAnalise.config.dificuldadeUser != undefined){
            dificuldadeUser = req.body.dadosAnalise.config.dificuldadeUser
        }
    }else{
        dificuldadeUser = req.body.dadosAnalise.dados.dificuldade
    }
    const questaoAvaliada = req.body.dadosAnalise.config.questoesAvaliar[req.body.dadosAnalise.dados.historicomateria][req.body.dadosAnalise.dados.historicoPosicao[req.body.dadosAnalise.dados.historicomateria][req.body.dadosAnalise.dados.historicoPosicao[req.body.dadosAnalise.dados.historicomateria].length-1]][0]
    const questaoSegundo = traformarTempoEmSegundo(questaoAvaliada.tempo_questao)
    const tempoPonto = verificarTempo(questaoSegundo,req.body.segundos)
    const nivelAntigo = req.body.dadosAnalise.config.nivelMaterias
    var novaAlternativa =  questaoAvaliada.alternativas.split(',')
    const somaTotalFeita =  novaAlternativa.map(Number).reduce((acc, curr) => acc + curr, 0)
    const dificuldadeQuestao =  100-((questaoAvaliada.respostas_correta/somaTotalFeita)*100)
    const [respostaUser, conteudoAvaliado] = req.body.resposta.split("|")
    novaAlternativa[respostaUser] = Number(novaAlternativa[respostaUser])+1
    req.body.dadosAnalise.dados.respostasHistorico[req.body.dadosAnalise.dados.historicomateria].push(`${respostaUser == questaoAvaliada.alternativa_correta ? "A" : "E"}|${questaoAvaliada.materia}|${questaoAvaliada.conteudo.toString()}|${req.body.dadosAnalise.config.nivelConteudo[req.body.dadosAnalise.dados.historicomateria][req.body.dadosAnalise.dados.historicoPosicao[req.body.dadosAnalise.dados.historicomateria][req.body.dadosAnalise.dados.historicoPosicao[req.body.dadosAnalise.dados.historicomateria].length-1]][0]}`)
    console.log(`(PRD) ${req.body.id}: assinalou a alternativa ${respostaUser} da questao ${questaoAvaliada.id} da prova diagnostica`)
    try{
        if(respostaUser == questaoAvaliada.alternativa_correta){
            var tempoFeito = (questaoSegundo+req.body.segundos)/2
            Questoes_Informacoes.update(
                { alternativas: novaAlternativa.toString(), respostas_corretas: Number(questaoAvaliada.respostas_corretas)+1, tempo_questao: trasformarSegundosEmTempo(tempoFeito)},
                { where: { id:questaoAvaliada.id} }   
            )
            if(dificuldadeQuestao > 60){
                conteudoAvaliado.split(',').map(conteudo => {
                    const dividirPonto = conteudo.split('=')
                    salvarPontoConteudo.push(`${(Number(dividirPonto[0])*(1.1+(tempoPonto/2))).toFixed(1)}=${Number(dividirPonto[1])+1}`)
                })
            }else{
                conteudoAvaliado.split(',').map(conteudo => {
                    const dividirPonto = conteudo.split('=')
                    salvarPontoConteudo.push(`${(Number(dividirPonto[0])*(1+(tempoPonto/4))).toFixed(1)}=${Number(dividirPonto[1])+1}`)
                })  
            }
        }else{
            const porcentagemIgual = questaoAvaliada.alternativas.split(',')[respostaUser]/somaTotalFeita
            Questoes_Informacoes.update(
                { alternativas: novaAlternativa.toString(), },
                { where: { id: questaoAvaliada.id} }
            )
            if(dificuldadeQuestao > 60){
                conteudoAvaliado.split(',').map(conteudo => {
                    const dividirPonto = conteudo.split('=')
                    salvarPontoConteudo.push(`${(Number(dividirPonto[0])*(1.5-porcentagemIgual)).toFixed(1)}=${Number(dividirPonto[1])+1}`)
                })   
            }else{
                conteudoAvaliado.split(',').map(conteudo => {
                    const dividirPonto = conteudo.split('=')
                    salvarPontoConteudo.push(`${(Number(dividirPonto[0])*(2-porcentagemIgual)).toFixed(1)}=${Number(dividirPonto[1])+1}`)
                })
            }
        }
        salvarPontoConteudo.forEach(conteudo =>{
            const [pontos, id] = conteudo.split('=')
            const conteudoExistente = dificuldadeUser?.find(conteudo => conteudo.startsWith(`${id}=`));
            if(conteudoExistente){
                const indice = dificuldadeUser.indexOf(conteudoExistente);
                const [idExistente, pontosExistente] = conteudoExistente.split('=');
                dificuldadeUser[indice] = `${id}=${parseInt(pontosExistente) + parseInt(pontos)}`;
            }else{
                dificuldadeUser.push(`${id}=${pontos}`)
            }
        })
        try{
            UserInfo.update(
                { dificuldade: dificuldadeUser.toString()},
                { where: { id_user: sanitizedData.id} }
            )
            if(req.body.dadosAnalise.dados.historicomateria == 2 && (req.body.dadosAnalise.dados.historicoPosicao[req.body.dadosAnalise.dados.historicomateria][req.body.dadosAnalise.dados.historicoPosicao[req.body.dadosAnalise.dados.historicomateria].length-1] == "4" || req.body.dadosAnalise.dados.historicoPosicao[req.body.dadosAnalise.dados.historicomateria][req.body.dadosAnalise.dados.historicoPosicao[req.body.dadosAnalise.dados.historicomateria].length-1] == "5")){
                console.log(`(PRD) ${req.body.id}: finalizou a avaliacao`)
                var newNivel = [0,0,0,0,0,0,0,0,0,0,0,0]
                var organizaRespostas = {}
                console.log(req.body)
                console.log(req.body.dadosAnalise.dados.respostasHistorico)
                var DificuldadesEncointradas = []
                req.body.dadosAnalise.config.nivelMaterias = req.body.dadosAnalise.config.nivelMaterias.split(',')
                req.body.dadosAnalise.dados.respostasHistorico.map(orgNivel => {
                    for(var orgMateria = 0; orgMateria < orgNivel.length; orgMateria++){
                        const separarInfor = orgNivel[orgMateria].split("|")
                        if(!organizaRespostas.hasOwnProperty(separarInfor[1])){
                            organizaRespostas[separarInfor[1]] = []
                        }
                        organizaRespostas[separarInfor[1]].push(orgNivel[orgMateria])
                        if(separarInfor[0] == "E"){
                            console.log('o dificuldades encontradas'+separarInfor)
                            console.log(separarInfor[2])
                            DificuldadesEncointradas.push(separarInfor[2])
                        }
                        if(separarInfor[3] != "undefined"){
                            atualizanivel = separarInfor[3]-req.body.dadosAnalise.config.nivelMaterias[separarInfor[1]]
                            if(separarInfor[0] == "A"){
                                if(atualizanivel == 0){
                                    newNivel[separarInfor[1]] = newNivel[separarInfor[1]]+1
                                }else{
                                    if(atualizanivel < 0){
                                        newNivel[separarInfor[1]] = newNivel[separarInfor[1]]+0.2
                                    }else{
                                        newNivel[separarInfor[1]] = newNivel[separarInfor[1]]+(atualizanivel+0.5)
                                    }
                                }
                            }else{
                                if(atualizanivel == 0){ 
                                    newNivel[separarInfor[1]] = newNivel[separarInfor[1]]-1
                                }else{
                                    if(atualizanivel > 0){
                                        newNivel[separarInfor[1]] = newNivel[separarInfor[1]]-0.2
                                    }else{
                                        newNivel[separarInfor[1]] = newNivel[separarInfor[1]]+(atualizanivel-0.5) // arrumar
                                    }
                                }
                            }
                        }
                    }
                })
                var materiaAvaliada = []
                for(var materia in organizaRespostas){
                    materiaAvaliada.push(materia)
                    if(Number(newNivel[materia]) != 0){
                        if(newNivel[materia] < 0){
                            if(Number(newNivel[materia]) < -2){
                                if(req.body.dadosAnalise.config.nivelMaterias[materia] >= 1){
                                    req.body.dadosAnalise.config.nivelMaterias[materia] = Number(req.body.dadosAnalise.config.nivelMaterias[materia])-1
                                }
                            }else{
                                if(req.body.dadosAnalise.config.nivelMaterias[materia] > 0){
                                    req.body.dadosAnalise.config.nivelMaterias[materia] = Number(req.body.dadosAnalise.config.nivelMaterias[materia])-0.5
                                }
                            }
                        }else{
                            if(Number(newNivel[materia]) > 2){
                                if(req.body.dadosAnalise.config.nivelMaterias[materia] <=3){
                                    req.body.dadosAnalise.config.nivelMaterias[materia] = Number(req.body.dadosAnalise.config.nivelMaterias[materia])+1
                                }
                            }else{
                                if(req.body.dadosAnalise.config.nivelMaterias[materia] <=3.5){
                                    req.body.dadosAnalise.config.nivelMaterias[materia] = Number(req.body.dadosAnalise.config.nivelMaterias[materia])+0.5
                                }
                            }
                        }
                    }
                }
                const valorNivel = dificuldadeUser.sort((a, b) => {
                    const aLevel = parseFloat(a.split('=')[1]);
                    const bLevel = parseFloat(b.split('=')[1]);
                    return aLevel - bLevel;
                })
                const mapaDificuldades = criarMapaDificuldades([valorNivel]);
                DificuldadesEncointradas = DificuldadesEncointradas.toString().split(",")
                for(addDificuldade = 0; addDificuldade < 10; addDificuldade++){
                    DificuldadesEncointradas.push(valorNivel[addDificuldade]?.split("=")[0])
                }
                var planoTemporario = []
                var PlanoDeEstudo = []
                const planosInfos = []
                while(DificuldadesEncointradas.length != 0){
                    console.log("repetindo a busca")
                    console.log(DificuldadesEncointradas)
                    const dificuldadesValor = await Conteudo.findAll({
                        where: {
                            codigo_conteudo:{
                                [Op.or]: DificuldadesEncointradas.map(valor => ({
                                    [Op.like]: valor
                                }))
                            }
                        },
                        attributes: { exclude: ['createdAt', 'updatedAt'] }
                    })
                    dificuldadesValor.map(planosAtivar => {
                        planosAtivar.grupo.split(',').map(planoInvestigar => {
                            if(planoTemporario.indexOf(planoInvestigar) == -1 && PlanoDeEstudo.indexOf(planoInvestigar) == -1){
                                if(req.body.dadosAnalise.config.planoHistorico.indexOf(planoInvestigar) != -1){
                                    planoTemporario.push(`R`+planoInvestigar)
                                }else{
                                    planoTemporario.push(planoInvestigar)
                                }
                            }
                        })
                    })
                    const buscarPlano = await Plano_estudos.findAll({
                        where: {
                            codigo_plano: {
                                [Op.or]: planoTemporario.filter(valor => !PlanoDeEstudo?.includes(valor))
                                    .map(valorFiltrado => ({
                                        [Op.like]: valorFiltrado
                                    }))
                            }
                        },
                        attributes: { exclude: ['createdAt', 'updatedAt'] }
                    });
                    PlanoDeEstudo.push(planoTemporario.toString().split(','))
                    planoTemporario = []
                    DificuldadesEncointradas = []
                    console.log(PlanoDeEstudo)
                    buscarPlano.map(conteudoPlanos => {
                        planosInfos.push({
                            codigo: conteudoPlanos.codigo_plano,
                            conteudo: conteudoPlanos.conteudo?.split(','),
                            previo: conteudoPlanos.conteudo_previo?.split(','),
                            nivel: conteudoPlanos.nivel,
                            materia: conteudoPlanos.materia
                        })
                        if(conteudoPlanos.conteudo_previo != undefined && conteudoPlanos.conteudo_previo != null && conteudoPlanos.conteudo_previo != ""){
                            conteudoPlanos.conteudo_previo?.split(',').map(buscarConteudoPrevio => {
                                console.log(buscarConteudoPrevio)
                                const pegaNivelConteudo = obterNivel(buscarConteudoPrevio, mapaDificuldades)
                                console.log(pegaNivelConteudo);
                                if(Number(pegaNivelConteudo) < -8 || pegaNivelConteudo == null){
                                    DificuldadesEncointradas.push(buscarConteudoPrevio)
                                }
                            })
                        }
                    })
                }
                const resultadoFinal = organizarDados(planosInfos);
                UserInfo.update(
                    { 
                        nivel: req.body.dadosAnalise.config.nivelMaterias.toString(), 
                        plano: resultadoFinal.toString()+',A'
                    },
                    { where: { id_user: sanitizedData.id} }
                )
                return res.json({
                    Validar: 'S',
                    nivelAntigo: nivelAntigo.split(','),
                    nivelNovo: req.body.dadosAnalise.config.nivelMaterias,
                    materiaAvaliada: Object.keys(organizaRespostas),
                });
            }
            const dados = req.body.dadosAnalise.dados;
            const historicoMateria = dados.historicomateria;
            const historicoPosicao = dados.historicoPosicao[historicoMateria];
            const respostasHistorico = dados.respostasHistorico[historicoMateria];
            if(historicoPosicao[historicoPosicao.length-1] == "4" || historicoPosicao[historicoPosicao.length-1] == "5" || historicoPosicao.length.length == 5){
                console.log(`(PRD) ${req.body.id}: mudou a materia da avaliacao`)
                retornoPergunta = "0"
                retornoMateria = Number(req.body.dadosAnalise.dados.historicomateria)+1
                req.body.dadosAnalise.dados.historicoPosicao[retornoMateria] = ['0']
            }else{
                retornoMateria = req.body.dadosAnalise.dados.historicomateria
                if(historicoPosicao.length == 1){
                    const primeiraResposta = respostasHistorico[0][0];
                    if(primeiraResposta == "A" && tempoPonto > 0.5){
                        console.log(`(PRD) ${req.body.id}: entrou na 2 questao (avanço de conteudo)`)
                        retornoPergunta = "2"
                    }else{
                        console.log(`(PRD) ${req.body.id}: entrou na 2 questao (mesmo conteudo/contraprova)`)
                        retornoPergunta = "1"
                    }
                }
                if(historicoPosicao.length === 2){
                    const primeiraResposta = respostasHistorico[0][0];
                    const segundaResposta = respostasHistorico[1][0];
                    if(historicoPosicao[1] === "2" && tempoPonto > 0.5 && primeiraResposta === "A" && segundaResposta === "A"){
                        console.log(`(PRD) ${req.body.id}: entrou na 3 questao (avanço de conteudo)`);
                        retornoPergunta = "5";
                    }else if(primeiraResposta === "E" && segundaResposta === "E") {
                        console.log(`(PRD) ${req.body.id}: entrou na 3 questao (errou muitas vezes, abaixamos o nivel)`);
                        retornoPergunta = "4";
                    }else{
                        console.log(`(PRD) ${req.body.id}: entrou na 3 questao (mesmo conteudo/contraprova)`);
                        retornoPergunta = historicoPosicao.length + 1;
                    }
                }
                if(historicoPosicao.length > 2 && historicoPosicao.length <= 3){
                    console.log(`(PRD) ${req.body.id}: entrou somar (questao-duvida)`);
                    retornoPergunta = historicoPosicao.length + 1;
                }
                if(historicoPosicao.length == 4){
                    console.log(`(PRD) ${req.body.id}: super contraprova`);
                    retornoPergunta = "4"
                }
                if(req.body.dadosAnalise.dados.historicoPosicao[req.body.dadosAnalise.dados.historicomateria] != undefined){
                    req.body.dadosAnalise.dados.historicoPosicao[req.body.dadosAnalise.dados.historicomateria].push(retornoPergunta)
                }else{
                    req.body.dadosAnalise.dados.historicoPosicao[req.body.dadosAnalise.dados.historicomateria] = [retornoPergunta]
                }
            }
            return res.json({
                Validar: 'N',
                materiaLocal: retornoMateria,
                conteudoLocal: retornoPergunta,
                historico: req.body.dadosAnalise.dados.respostasHistorico,
                dificuldade: dificuldadeUser,
                historicoPosicao: req.body.dadosAnalise.dados.historicoPosicao,
            });
        }catch(error){
            console.error(`ERRO 1_AQ#0002: ${error}`)
            ErrosVerificar('NINGUEM', '1_AQ#0002', 'NADA')
            return res.status(500).json({
                status: `1_AQ#0002`,
                msg: 'O sistema enfrentou uma dificuldade ao tentar estabelecer uma conexão com o banco para atualizar as suas informações!'
            });
        }
    }catch(error){
        console.error(`ERRO 1_AQ#0001: ${error}`)
        ErrosVerificar('NINGUEM', '1_AQ#0001', 'NADA')
        return res.status(500).json({
            status: `1_AQ#0001`,
            msg: 'O sistema enfrentou uma dificuldade ao tentar estabelecer uma conexão com o banco de dados das informações das questões!'
        });
    }
});
module.exports = router;