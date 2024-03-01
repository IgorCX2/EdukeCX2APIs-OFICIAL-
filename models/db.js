const { Sequelize } = require('sequelize');
const sequelize = new Sequelize(process.env.Name, process.env.User, process.env.Password, {
  host: process.env.Host,
  port: process.env.Port,
  dialect: 'mysql',
  //logging: false,
  dialectModule: require('mysql2'),
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci'
  },
  pool: {
    max: 50,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
});
sequelize.authenticate()
.then(()=>{
  console.log("Autenticado!");
}).catch(()=>{
  console.log("erro no banco de dados! Tente atualizar a pagina ou entre em contato com o suporte");
});
module.exports = sequelize;