const { Sequelize, DataTypes } = require('sequelize');
const db = require('./db');
const UserConfig = db.define('userconfig', {
    id:{
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    nome:{
        type: Sequelize.STRING(50),
        allowNull: false
    },
    email:{
        type: Sequelize.STRING,
        allowNull: false
    },
    senha:{
        type: Sequelize.STRING,
        allowNull: false
    },
    moedas:{
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: '0',
    },
    plano:{
        type: Sequelize.ENUM,
        values: ['N', 'S'],
        defaultValue: 'N',
    },
    items:{
        type: Sequelize.JSON
    },
    stats:{
        type: Sequelize.STRING(20),
        defaultValue: '0',
    },
    endereco:{
        type: Sequelize.STRING(100),
    },
});
UserConfig.sync();
module.exports = UserConfig;