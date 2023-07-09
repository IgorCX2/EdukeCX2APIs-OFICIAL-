const { Sequelize } = require('sequelize');
const db = require('./db');
const UserInfo = db.define('userinfo', {
    id_user:{
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    plano:{
        type: Sequelize.STRING,
    },
    dificuldade:{
        type: Sequelize.TEXT,
    },
    historicoplano:{
        type: Sequelize.TEXT,
    },
    historiquestao:{
        type: Sequelize.TEXT,
    },
    ativos:{
        type: Sequelize.TEXT, //questao e plano
    },
    nivel:{
        type: Sequelize.STRING(50),
    },
    erros_questoes:{
        type: Sequelize.STRING,
    },
});
UserInfo.sync();
module.exports = UserInfo;