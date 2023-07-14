const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('edukecx2', 'igorcortez', 'Ig@rCXEduke', {
  host: 'aprendacomeduke.com.br',
  port: '3306',
  dialect: 'mysql',
  //logging: false,
  dialectModule: require('mysql2'),
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_general_ci'
}
});
sequelize.authenticate()
.then(()=>{
  console.log("autenticado");
}).catch(()=>{
  console.log("erro");
});
module.exports = sequelize;