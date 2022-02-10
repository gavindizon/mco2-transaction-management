const express = require("express");
const dotenv = require("dotenv");
const route = require("./routes/route");
const { executeCentralRecovery, executeSideRecovery } = require("./controllers/executeRecovery");

dotenv.config({ path: ".env" });

const app = express();
app.use(express.json());

app.use("/api/movies/", executeCentralRecovery, executeSideRecovery, route);
module.exports = app;
