const helmet = require('helmet');
const express = require("express")
const cors = require("cors");

const app = express()
app.use(express.json())
app.use(helmet());
app.use(cors());

const questao = require("./api/questao");
const questoesdiagnostica = require("./api/questoesdiagnostica");
const plano = require("./api/plano");
const frases = require("./api/frases");
const userconfig = require("./api/userconfig");
const userinfo = require("./api/userinfo");


app.use("/api/questoesdiagnostica", questoesdiagnostica);
app.use("/api/questao", questao);
app.use("/api/plano", plano);
app.use("/api/userconfig", userconfig);
app.use("/api/frases", frases);
app.use("/api/userinfo", userinfo);
const PORT = process.env.PORT || 8080
app.listen(PORT, () => console.log(`porta aberta em ${PORT}`))