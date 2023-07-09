const { Op } = require("sequelize");
const helmet = require('helmet');
const { RateLimiterMemory } = require('rate-limiter-flexible');
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
const maxAttempts = 5;
const windowMs = 30 * 60 * 1000;

const limiterQuestoes = new RateLimiterMemory({
    points: maxAttempts,
    duration: windowMs,
});
router.post('/questoes-diagnostico', async (req, res) => {
    try{
        const clientIp = req.ip
        const rateLimiterRes = await limiterQuestoes.consume(clientIp);
        var guardarPlano = []
        var materiaComPesos = []
        var materiaAvaliar = []
        var conteudoAvaliar = []
        var conteudoProva = []
        var nivelConteudo = []
        function SelecionarMateria(origem, especificar){
            MexerMeuPlano = origem.splice(origem.indexOf(especificar[Math.floor(Math.random() * especificar.length)]),1)
            if(MexerMeuPlano.length != 0){
                conteudoAvaliar.push(MexerMeuPlano[0]?.conteudo.split(',')[Math.floor(Math.random() * MexerMeuPlano[0].conteudo?.split(',').length)])
                nivelConteudo.push(MexerMeuPlano[0].nivel)
            }else{
                conteudoAvaliar.push(Math.floor(Math.random() * 341))
                nivelConteudo.push(0)
            }
        }
        function OrganizarArray(arr, size) {
            let organizar = [];
            let count = 0
            for (let i = 0; i < arr.length; i += size) {
                let organiza = arr.slice(i, i + size);
                organizar.push(organiza);
                organizar[count].push(organizar[count].shift())
                organizar[count].push(organizar[count].shift())
                count++
            }
            return organizar;
        }
        const segurancaNumero =  /^\d+$/
        if(segurancaNumero.test(req.body.id)){
            const userInfosInicial = await UserInfo.findOne({
                where: {
                    id_user: req.body.id
                },
                attributes: ['nivel','dificuldade', 'historicoplano']
            })

            const nivelMateriasUser = userInfosInicial.nivel.split(',').map(nivel =>{
                return nivel[0]
            })
            console.log('kkk'+nivelMateriasUser)
            for(var cnt = 0; cnt < 11; cnt++){
                let contadorNivel
                if(nivelMateriasUser[cnt] == 4){
                    contadorNivel = 1
                }else{
                    contadorNivel = 4 - Number(nivelMateriasUser[cnt])
                }
                for(var mcp = 0; mcp < contadorNivel; mcp++){
                    materiaComPesos.push(cnt)
                }
            }
            console.log(materiaComPesos)
            for(var srtal = 0; srtal<4; srtal++){
                const materiaSorteada = materiaComPesos[Math.floor(Math.random() * materiaComPesos.length)]
                materiaAvaliar.push(materiaSorteada)
                materiaComPesos.splice(materiaComPesos.indexOf(materiaSorteada),`${nivelMateriasUser[materiaSorteada] == 4 ? 1 : 4 - nivelMateriasUser[materiaSorteada]}`) 
            }
            
            var Plano_estudos_Materia = await Plano_estudos.findAll({
                where: {
                    materia: materiaAvaliar,
                },
                attributes: ['codigo_plano', 'conteudo', 'nivel', 'conteudo_previo', 'materia']
            })
            for(var mc = 0; mc < 4; mc++){
                let planoNivelInferior = Plano_estudos_Materia.filter(plano => plano.nivel == Number(nivelMateriasUser[materiaAvaliar[mc]])-1 && plano.materia == materiaAvaliar[mc])
                let planoNivelSuperior = Plano_estudos_Materia.filter(plano => plano.nivel == Number(nivelMateriasUser[materiaAvaliar[mc]])+1 && plano.materia == materiaAvaliar[mc])
                if(planoNivelInferior.length == 0){
                    SelecionarMateria(Plano_estudos_Materia,Plano_estudos_Materia.filter(plano => plano.materia == materiaAvaliar[mc]))
                }else{
                    SelecionarMateria(Plano_estudos_Materia,planoNivelInferior)
                }
                if(planoNivelSuperior.length == 0){
                    SelecionarMateria(Plano_estudos_Materia,Plano_estudos_Materia.filter(plano => plano.materia == materiaAvaliar[mc]))
                }else{
                    SelecionarMateria(Plano_estudos_Materia,planoNivelSuperior)
                }
                let meuNivel = Plano_estudos_Materia.filter(plano => plano.nivel == Number(nivelMateriasUser[materiaAvaliar[mc]]))
                var guardarPlano = []
                if(guardarPlano[materiaAvaliar[mc]] == undefined){
                    guardarPlano[mc] = []
                }
                for(var c = 0; c < 2; c++){
                    if(meuNivel.length != 0){
                        const planoSelecionado = meuNivel.splice(meuNivel.indexOf(meuNivel[Math.floor(Math.random() * meuNivel.length)]),1)
                        var conteudoPlanoSelecionado = planoSelecionado[0].conteudo?.split(',')
                        for(var adcmt = 0; adcmt < 2; adcmt++){
                            const conteudoSeleciondo = conteudoPlanoSelecionado.splice(Math.floor(Math.random() * conteudoPlanoSelecionado.length),1)
                            if(conteudoSeleciondo.length != 0){
                                conteudoAvaliar.push(conteudoSeleciondo.toString())
                                nivelConteudo.push(nivelMateriasUser[materiaAvaliar[mc]])
                            }
                        }
                        conteudoPlanoSelecionado.map(conteudo => {
                            if(conteudo.length != 0){
                                guardarPlano[mc].push(`${conteudo}|${planoSelecionado[0].nivel}`)
                            }
                        })
                    }else{
                        for(var adcalea = 0; adcalea < 2; adcalea++){
                            SelecionarMateria(Plano_estudos_Materia,Plano_estudos_Materia.filter(plano => plano.materia == materiaAvaliar[mc]))
                        }
                    }
                }
                while(conteudoAvaliar.length < 6 + (6*mc)){
                    if(guardarPlano[mc].length != 0){
                        const conteudoReservaSorteado = guardarPlano[mc].splice(Math.floor(Math.random() * guardarPlano[mc].length),1).toString().split('|')
                        conteudoAvaliar.push(conteudoReservaSorteado[0])
                        nivelConteudo.push(conteudoReservaSorteado[1])
                    }else{
                        SelecionarMateria(Plano_estudos_Materia,Plano_estudos_Materia.filter(plano => plano.materia == materiaAvaliar[mc]))
                    }
                }
                const conteudoAvaliarOrganizada = OrganizarArray(conteudoAvaliar, 6)
                console.log(conteudoAvaliarOrganizada)
            }
            var questaoOrganizaPorConteudo = {}
            const pesquisarQuestoes = await Questoes_Informacoes.findAll({
                where: {
                    conteudo:{
                        [Op.or]: conteudoAvaliar.map(valor => ({
                            [Op.like]: `%,${valor}%`
                        }))
                    }
                },
                attributes: { exclude: ['createdAt', 'updatedAt'] }
            })
            pesquisarQuestoes.map(conteudoQuestao => {
                const conteudoDaQuestao = conteudoQuestao.conteudo.split(',')
                for(var pesquisarConteudoQuestoes = 0; pesquisarConteudoQuestoes < conteudoDaQuestao.length; pesquisarConteudoQuestoes++){
                    if(conteudoAvaliar.indexOf(conteudoDaQuestao[pesquisarConteudoQuestoes]) != -1){
                        if(questaoOrganizaPorConteudo[conteudoDaQuestao[pesquisarConteudoQuestoes]] != undefined){
                            questaoOrganizaPorConteudo[conteudoDaQuestao[pesquisarConteudoQuestoes]].push(conteudoQuestao)
                        }else{
                            questaoOrganizaPorConteudo[conteudoDaQuestao[pesquisarConteudoQuestoes]] = [conteudoQuestao]
                        }
                        break;
                    }
                }
            })
            for(var percorrerConteudo = 0; percorrerConteudo<conteudoAvaliar.length; percorrerConteudo++){
                if(questaoOrganizaPorConteudo[conteudoAvaliar[percorrerConteudo]] && questaoOrganizaPorConteudo[conteudoAvaliar[percorrerConteudo]] != undefined && questaoOrganizaPorConteudo[conteudoAvaliar[percorrerConteudo]]?.length != 0){
                    conteudoProva.push(questaoOrganizaPorConteudo[conteudoAvaliar[percorrerConteudo]].splice(Math.floor(Math.random() * questaoOrganizaPorConteudo[conteudoAvaliar[percorrerConteudo]].length-1),1))
                }else{
                    console.log("nao"+conteudoAvaliar[percorrerConteudo])
                    const posicaoConteudo = Math.trunc(percorrerConteudo/6)
                    const tamanhoAtual = conteudoProva.length
                    for(var contadorNaoTem = 0+(posicaoConteudo*6); contadorNaoTem < percorrerConteudo; contadorNaoTem++){
                        if(questaoOrganizaPorConteudo[conteudoAvaliar[contadorNaoTem]] != undefined && questaoOrganizaPorConteudo[conteudoAvaliar[contadorNaoTem]]?.length != 0){
                            conteudoProva.push(questaoOrganizaPorConteudo[conteudoAvaliar[contadorNaoTem]].splice(Math.floor(Math.random() * questaoOrganizaPorConteudo[conteudoAvaliar[contadorNaoTem]].length-1),1))
                            break 
                        }
                    }
                    if(conteudoProva.length == tamanhoAtual){
                        console.log("pesquisar outro")
                        for(var contadorBuscarRepetidos = 0; contadorBuscarRepetidos < 24; contadorBuscarRepetidos++){
                            if(questaoOrganizaPorConteudo[conteudoAvaliar[contadorBuscarRepetidos]]?.length >= 2){
                                conteudoProva.push(questaoOrganizaPorConteudo[conteudoAvaliar[contadorBuscarRepetidos]].splice(Math.floor(Math.random() * questaoOrganizaPorConteudo[conteudoAvaliar[contadorBuscarRepetidos]].length-1),1))
                                break
                            }
                        }
                        if(conteudoProva.length == tamanhoAtual){
                            conteudoProva.push("A")
                        }
                    }
                }
            }
            return res.json({
                user: req.body.id,
                nivelMaterias: userInfosInicial.nivel,
                dificuldadeUser: userInfosInicial.dificuldade?.split(','),
                historicoPlano: userInfosInicial.historicoplano,
                materias: materiaAvaliar.splice(0,4),
                conteudoAvaliar: OrganizarArray(conteudoAvaliar, 6),
                nivelConteudo: OrganizarArray(nivelConteudo, 6),
                questoesAvaliar: OrganizarArray(conteudoProva, 6),
            });
        }
        return res.json({
            status: `1_IQD#21535`,
            msg: `nenhum usuário encontrado!`,
        });


    }catch(error){
        return res.status(429).json({
            msg: 'Você tentou realizar esta ação muitas vezes. Aguarde alguns minutos e tente novamente.',
            status: '3_MD#92429',
          });
    }
});
router.post('/analise-questao', async (req, res) => {
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
    function trasformarSegundosEmTempo(segundos){
        var horas = Math.floor(segundos / 3600);
        var minutos = Math.floor((segundos % 3600) / 60);
        var segundo = segundos % 60;
        var tempoFormatado = horas.toString().padStart(2, '0') + ':' + minutos.toString().padStart(2, '0') + ':' + segundo.toString().padStart(2, '0');
        return tempoFormatado;
    }
    var salvarPontoConteudo = []
    if(req.body.historicomateria == undefined){
        req.body.historicomateria = '0'
    }
    if(req.body.respostasHistorico[req.body.historicomateria] == undefined){
        req.body.respostasHistorico[req.body.historicomateria] = []
    }
    var dificuldadeUser 
    console.log('fi'+req.body.dificuldade)
    if(req.body.dificuldade == undefined){
        dificuldadeUser =  []
    }else{
        dificuldadeUser =  req.body.dificuldade
    }
    let[horas, minutos, segundos] = req.body.questao.tempo.split(":")
    let totalSegundos = (+horas * 60 * 60) + (+minutos * 60) + (+segundos);
    
    var tempoPonto = -1*((req.body.segundos-totalSegundos)/totalSegundos)
    if(tempoPonto > -0.3 && tempoPonto < 0.3){
        tempoPonto = 0.4
    }
    const nivelAntigo = req.body.config.nivelMaterias
    var novaAlternativa =  req.body.questao.Totalassinaladas.split(',')
    const somaTotalFeita =  novaAlternativa.map(Number).reduce((acc, curr) => acc + curr, 0);
    const dificuldadeQuestao =  100-((req.body.questao.totalderespostasCertas/somaTotalFeita)*100)
    const [respostaUser, conteudoAvaliado] = req.body.resposta.split("|")
    console.log(req.body.resposta)
    novaAlternativa[respostaUser] = Number(novaAlternativa[respostaUser])+1
    if(respostaUser == req.body.questao.resposta_correta){
        req.body.respostasHistorico[req.body.historicomateria].push(`A|${req.body.questao.materia}|${req.body.questao.conteudo.toString()}|${req.body.questao.nivelConteudo}`)
        var tempoFeito = (totalSegundos+req.body.segundos)/2
        Questoes_Informacoes.update(
            { alternativas: novaAlternativa.toString(), respostas_corretas: Number(req.body.questao.totalderespostasCertas)+1, tempo_questao: trasformarSegundosEmTempo(tempoFeito)},
            { where: { id: req.body.questao.id} }   
        )
        console.log("kkk"+tempoPonto)
        if(dificuldadeQuestao > 60){
            conteudoAvaliado.split(',').map(conteudo => {
                const dividirPonto = conteudo.split('=')
                console.log(dividirPonto[0])
                console.log(Number(dividirPonto[0])*(1.1+(tempoPonto/2)).toFixed(1))
                console.log(1.1+(tempoPonto/2))
                salvarPontoConteudo.push(`${Number(dividirPonto[0])*(1.1+(tempoPonto/2)).toFixed(1)}=${dividirPonto[1]}`)
            })
        }else{
            conteudoAvaliado.split(',').map(conteudo => {
                const dividirPonto = conteudo.split('=')
                console.log(dividirPonto[0])
                console.log(Number(dividirPonto[0])*(1+(tempoPonto/4)).toFixed(1))
                console.log(1+(tempoPonto/4))
                salvarPontoConteudo.push(`${Number(dividirPonto[0])*(1+(tempoPonto/4)).toFixed(1)}=${dividirPonto[1]}`)
            })  
        }
    }else{
        req.body.respostasHistorico[req.body.historicomateria].push(`E|${req.body.questao.materia}|${req.body.questao.conteudo.toString()}|${req.body.questao.nivelConteudo}`)
        const porcentagemIgual = req.body.questao.Totalassinaladas.split(',')[respostaUser]/somaTotalFeita
        console.log(req.body.questao.Totalassinaladas.split(',')[respostaUser])
        console.log(somaTotalFeita)
        console.log("ooo"+porcentagemIgual)
        Questoes_Informacoes.update(
            { alternativas: novaAlternativa.toString(), },
            { where: { id: req.body.questao.id} }
        )
        if(dificuldadeQuestao > 60){
            conteudoAvaliado.split(',').map(conteudo => {
                const dividirPonto = conteudo.split('=')
                console.log(dividirPonto[0])
                console.log(Number(dividirPonto[0])*(1.5-porcentagemIgual).toFixed(1))
                console.log(1.5-porcentagemIgual)
                salvarPontoConteudo.push(`${Number(dividirPonto[0])*(1.5-porcentagemIgual).toFixed(1)}=${dividirPonto[1]}`)
            })   
        }else{
            conteudoAvaliado.split(',').map(conteudo => {
                const dividirPonto = conteudo.split('=')
                console.log(dividirPonto[0])
                console.log(2-porcentagemIgual)
                console.log(Number(dividirPonto[0])*(2-porcentagemIgual).toFixed(1))
                salvarPontoConteudo.push(`${Number(dividirPonto[0])*(2-porcentagemIgual).toFixed(1)}=${dividirPonto[1]}`)
            })
        }
    }
    salvarPontoConteudo.forEach(conteudo =>{
        const [pontos, id] = conteudo.split('=')
        const conteudoExistente = dificuldadeUser.find(conteudo => conteudo.startsWith(`${id}=`));
        if(conteudoExistente){
            const indice = dificuldadeUser.indexOf(conteudoExistente);
            const [idExistente, pontosExistente] = conteudoExistente.split('=');
            dificuldadeUser[indice] = `${id}=${parseInt(pontosExistente) + parseInt(pontos)}`;
        }else{
            dificuldadeUser.push(`${id}=${pontos}`)
        }
    })
    console.log(req.body.config.user)
    UserInfo.update(
        { dificuldade: dificuldadeUser.toString()},
        { where: { id_user: req.body.config.user} }
    )
    if(req.body.historicomateria == undefined){
        req.body.historicomateria = '0'
    }
    console.log(req.body.respostasHistorico[req.body.historicomateria][req.body.contadorQuestoes-1])
    if(req.body.historicoposicao[req.body.historicomateria] == undefined){
        req.body.historicoposicao[req.body.historicomateria] = ['0']
    }
    if(req.body.historicomateria == 3 && (req.body.historicoposicao[req.body.historicomateria][req.body.historicoposicao[req.body.historicomateria].length-1] == "4" || req.body.historicoposicao[req.body.historicomateria][req.body.historicoposicao[req.body.historicomateria].length-1] == "5")){
        console.log("ja acabou???")
        var organizaRespostas = {}
        var newNivel = [0,0,0,0,0,0,0,0,0,0,0,0]
        var atualizanivel
        var DificuldadesEncointradas = []
        //console.log(req.body.respostasHistorico)
        req.body.config.nivelMaterias = req.body.config.nivelMaterias.split(",")
        req.body.respostasHistorico.map(orgNivel => {
            for(var orgMateria = 0; orgMateria < orgNivel.length; orgMateria++){
                const separarInfor = orgNivel[orgMateria].split("|")
                if(!organizaRespostas.hasOwnProperty(separarInfor[1])){
                    organizaRespostas[separarInfor[1]] = []
                }
                organizaRespostas[separarInfor[1]].push(orgNivel[orgMateria])
                if(separarInfor[0] == "E"){
                    DificuldadesEncointradas.push(separarInfor[2])
                }
                if(separarInfor[3] != "undefined"){
                    //console.log(orgNivel[orgMateria])
                    //console.log(separarInfor[3])
                    //console.log(req.body.config.nivelMaterias[separarInfor[1]])
                    atualizanivel = separarInfor[3]-req.body.config.nivelMaterias[separarInfor[1]]
                    //console.log(atualizanivel)
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
        //console.log("nivel")
        //console.log(organizaRespostas)
        //console.log(newNivel)
        //console.log(req.body.config.nivelMaterias)
        var materiaAvaliada = []
        for(var materia in organizaRespostas){
            materiaAvaliada.push(materia)
            if(Number(newNivel[materia]) != 0){
                if(newNivel[materia] < 0){
                    if(Number(newNivel[materia]) < -2){
                        if(req.body.config.nivelMaterias[materia] >= 1){
                            req.body.config.nivelMaterias[materia] = Number(req.body.config.nivelMaterias[materia])-1
                        }
                    }else{
                        if(req.body.config.nivelMaterias[materia] > 0){
                            req.body.config.nivelMaterias[materia] = Number(req.body.config.nivelMaterias[materia])-0.5
                        }
                    }
                }else{
                    if(Number(newNivel[materia]) > 2){
                        if(req.body.config.nivelMaterias[materia] <=3){
                            req.body.config.nivelMaterias[materia] = Number(req.body.config.nivelMaterias[materia])+1
                        }
                    }else{
                        if(req.body.config.nivelMaterias[materia] <=3.5){
                            req.body.config.nivelMaterias[materia] = Number(req.body.config.nivelMaterias[materia])+0.5
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
        //console.log(valorNivel.splice(0,10))
        console.log(DificuldadesEncointradas)
        DificuldadesEncointradas = DificuldadesEncointradas.toString().split(",")
        for(addDificuldade = 0; addDificuldade < 10; addDificuldade++){
            console.log(valorNivel[addDificuldade])
            DificuldadesEncointradas.push(valorNivel[addDificuldade].split("=")[0])
        }
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
        var repeticaoConteudo = {}
        DificuldadesEncointradas.map(conteudoBuscar => {
            if(conteudoBuscar != ""){
                let econtrarConteudo = dificuldadesValor.find(conteudo => conteudo.codigo_conteudo == conteudoBuscar)
                console.log(econtrarConteudo.codigo_conteudo)
                let separarGrupo = econtrarConteudo.grupo?.split(",")
                console.log(separarGrupo)
                for(var contarSeparar = 0; contarSeparar < separarGrupo.length ; contarSeparar++){
                   if(!repeticaoConteudo.hasOwnProperty(separarGrupo[contarSeparar])){
                       repeticaoConteudo[separarGrupo[contarSeparar]] = 0
                   }
                   repeticaoConteudo[separarGrupo[contarSeparar]] = Number(repeticaoConteudo[separarGrupo[contarSeparar]])+1
               }
            }
        })
        repeticaoConteudo = Object.entries(repeticaoConteudo).sort((a, b) => b[1] - a[1]).map(entry => entry[0]);
        console.log(repeticaoConteudo)
        var salvarNovoPlano = repeticaoConteudo.splice(0,6)
        const buscarPlano = await Plano_estudos.findAll({
            where: {
                codigo_plano:{
                    [Op.or]: salvarNovoPlano.map(valor => ({
                        [Op.like]: valor
                    }))
                }
            },
            attributes: { exclude: ['createdAt', 'updatedAt'] }
        })

        var PlanoDeEstudos = []
        var salvarSaber = []
        if(req.body.planoHistorico == undefined){
            req.body.planoHistorico = []
        }
        buscarPlano.map(saber => {
            
            console.log(req.body.planoHistorico)
            if(req.body.planoHistorico.indexOf(saber.codigo_plano) == -1){
                var separarConteudoPlano = saber.conteudo.split(',')
                var separaSaberesPlano = saber.conteudo_previo.split(',')
                console.log('---')
                console.log(saber.codigo_plano)
                console.log(separarConteudoPlano)
                console.log(separaSaberesPlano)
                var salvarPlano = []
    
                for(var contadorSeparadorConteudo = 0; contadorSeparadorConteudo < valorNivel.length; contadorSeparadorConteudo++){
                    if(separarConteudoPlano.length != 0 || separaSaberesPlano.length !=0){
                        const elemento = valorNivel[contadorSeparadorConteudo]
                        const separarElemento = elemento.split('=')
                        //console.log(separarElemento)
                        if(separarConteudoPlano.indexOf(separarElemento[0]) !== -1){
                            console.log(separarElemento)
                            separarConteudoPlano.splice(separarConteudoPlano.indexOf(separarElemento[0]),1)
                            if(Number(separarElemento[1]) > 5){
                                salvarPlano.push(`R${separarElemento[0]}&`)
                                console.log('r'+salvarPlano)
                            }
                        }else{
                            if(separaSaberesPlano.indexOf(separarElemento[0]) !== -1){
                                console.log(separarElemento)
                                separaSaberesPlano.splice(separaSaberesPlano.indexOf(separarElemento[0]),1)
                                if(Number(separarElemento[1]) < 5){
                                    salvarSaber.push(separarElemento[0])
                                    console.log('sa'+salvarSaber)
                                }
                            }
                        }
                    }else{
                        break
                    }
                }
                console.log(salvarPlano)
                PlanoDeEstudos.push(`${saber.codigo_plano}|${salvarPlano.toString()}`)
            }else{
                PlanoDeEstudos.push(`r${saber.codigo_plano}|`)
            }
        })
        console.log('aaaaa'+salvarSaber)
        while(salvarSaber.length != 0){
            console.log("tem saber"+salvarSaber)
            const SaberConteudoValor = await Conteudo.findAll({
                where: {
                    codigo_conteudo:{
                        [Op.or]: salvarSaber.map(valor => ({
                            [Op.like]: valor
                        }))
                    }
                },
                attributes: { exclude: ['createdAt', 'updatedAt'] }
            })
            salvarSaber = []
            SaberConteudoValor.map(valorGrupoSaber => {
                salvarSaber.push(valorGrupoSaber.grupo)
            })
            salvarSaber = salvarSaber.toString().split(',')

            const buscarPlanoNovamente = await Plano_estudos.findAll({
                where: {
                    codigo_plano:{
                        [Op.or]: salvarSaber.map(valor => ({
                            [Op.like]: valor
                        }))
                    }
                },
                attributes: { exclude: ['createdAt', 'updatedAt'] }
            })
            salvarSaber = []
            buscarPlanoNovamente.map(saber => {
                if(req.body.planoHistorico.indexOf(saber.codigo_plano) == -1){
                    console.log(salvarSaber)
                    var separarConteudoPlano = saber.conteudo.split(',')
                    console.log('---')
                    console.log(saber.codigo_plano)
                    console.log(separarConteudoPlano)
                    salvarPlano = []
                    
                    for(var contadorSeparadorConteudo = 0; contadorSeparadorConteudo < valorNivel.length; contadorSeparadorConteudo++){
                        if(separarConteudoPlano.length != 0){
                            const elemento = valorNivel[contadorSeparadorConteudo]
                            const separarElemento = elemento.split('=')
                            //console.log(separarElemento)
                            if(separarConteudoPlano.indexOf(separarElemento[0]) !== -1){
                                console.log(separarElemento)
                                separarConteudoPlano.splice(separarConteudoPlano.indexOf(separarElemento[0]),1)
                                if(Number(separarElemento[1]) > 5){
                                    salvarPlano.push(`R${separarElemento[0]}&`)
                                    console.log('r'+salvarPlano)
                                }
                            }
                        }else{
                            break
                        }
                    }
                    console.log(salvarPlano)
                    if(PlanoDeEstudos.indexOf(`${saber.codigo_plano}|${salvarPlano.toString()}`) == -1){
                        PlanoDeEstudos.unshift(`${saber.codigo_plano}|${salvarPlano.toString()}`)
                    }
                }else{
                    PlanoDeEstudos.unshift(`r${saber.codigo_plano}|`)
                }
            })
        }
        PlanoDeEstudos.push(`A`)
        UserInfo.update(
            { 
                nivel: req.body.config.nivelMaterias.toString(), 
                plano: PlanoDeEstudos.toString()
            },
            { where: { id_user: req.body.config.user} }
        )
        console.log(PlanoDeEstudos)
        console.log(salvarSaber)
        return res.json({
            Validar: 'S',
            DificuldadesEncointradas: dificuldadesValor.splice(0,dificuldadesValor.length-10),
            nivelAntigo: nivelAntigo.split(','),
            nivelNovo: req.body.config.nivelMaterias,
            materiaAvaliada: Object.keys(organizaRespostas),
        });
    }
    if(req.body.historicoposicao[req.body.historicomateria][req.body.historicoposicao[req.body.historicomateria].length-1] == "4" || req.body.historicoposicao[req.body.historicomateria][req.body.historicoposicao[req.body.historicomateria].length-1] == "5" || req.body.historicoposicao[req.body.historicomateria].length == 5){
        console.log("mudou de materia kkkkkkkk")
        retornoPergunta = "0"
        retornoMateria = Number(req.body.historicomateria)+1
        req.body.historicoposicao[retornoMateria] = ['0']
    }else{
        if(req.body.historicoposicao[req.body.historicomateria].length == 1){
            console.log("entrou na 1 questao")
            retornoPergunta = "1"
            retornoMateria = req.body.historicomateria
            if(req.body.respostasHistorico[req.body.historicomateria][0][0] == "A" && tempoPonto > 0.5){
                console.log("top entrou na 1 questao")
                retornoPergunta = "2"
            }
        }
        if(req.body.historicoposicao[req.body.historicomateria].length == 2){
            console.log("entrou na 2 questao")
            retornoMateria = req.body.historicomateria
            retornoPergunta = Number(req.body.historicoposicao[req.body.historicomateria][req.body.historicoposicao[req.body.historicomateria].length-1])+1
            if(req.body.historicoposicao[req.body.historicomateria][1] == "2" && tempoPonto > 0.5  && req.body.respostasHistorico[req.body.historicomateria][0][0] == "A" && req.body.respostasHistorico[req.body.historicomateria][1][0] == "A"){
                retornoPergunta = "5"
                console.log("top entrou na 2 questao")
            }
            console.log(req.body.historicoposicao[req.body.historicomateria])
            console.log(req.body.respostasHistorico[req.body.historicomateria])
            if(req.body.historicoposicao[req.body.historicomateria][1] == "1" && req.body.respostasHistorico[req.body.historicomateria][0][0] == "E"  && req.body.respostasHistorico[req.body.historicomateria][1][0] == "E"){
                retornoPergunta = "4"
                console.log("burro entrou na 2 questao")
            }
        }
        if(req.body.historicoposicao[req.body.historicomateria].length > 2 && req.body.historicoposicao[req.body.historicomateria].length <= 3){
            console.log("entrou somnar questao")
            retornoMateria = req.body.historicomateria
            retornoPergunta = Number(req.body.historicoposicao[req.body.historicomateria][req.body.historicoposicao[req.body.historicomateria].length-1])+1
        }
        if(req.body.historicoposicao[req.body.historicomateria].length == 4){
            console.log("teste")
            retornoMateria = req.body.historicomateria
            retornoPergunta = "4"
        }

        if(req.body.historicoposicao[req.body.historicomateria] != undefined){
            req.body.historicoposicao[req.body.historicomateria].push(retornoPergunta)
        }else{
            req.body.historicoposicao[req.body.historicomateria] = [retornoPergunta]
        }
    }

    //console.log(req.body.historicomateria)
    //console.log(req.body.historicoposicao)
    console.log(dificuldadeUser)
    return res.json({
        Validar: 'N',
        materiaLocal: retornoMateria,
        conteudoLocal: retornoPergunta,
        historico: req.body.respostasHistorico,
        dificuldade: dificuldadeUser,
        historicoPosicao: req.body.historicoposicao,
    });
});


module.exports = router;