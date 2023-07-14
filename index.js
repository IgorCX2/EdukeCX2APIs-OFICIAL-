const helmet = require('helmet');
const express = require("express")
const cors = require("cors");

const app = express()
app.use(express.json())
app.use(helmet());
app.use(cors());
const entradasApi = ['http://localhost:3000'];
app.use(cors({
    origin: function (origin, callback) {
        console.log(origin)
      if (entradasApi.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Acesso negado pela política!'));
      }
    }
}));

const contaInicial = require("./api/containicial");
app.use("/api/containicial", contaInicial);

const PORT = process.env.PORT || 8080
app.listen(PORT, () => console.log(`porta aberta em ${PORT}`))