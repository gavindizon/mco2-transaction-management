const express = require("express");
const dotenv = require("dotenv");
const route = require("./routes/route");
const { executeCentralRecovery, executeSideRecovery } = require("./controllers/executeRecovery");
const runInParallel = require("express-parallel-middleware-loader");

dotenv.config({ path: ".env" });

const app = express();
app.use(express.json());

app.use(runInParallel(executeCentralRecovery, executeSideRecovery));
app.use("/api/movies/", route);
module.exports = app;
