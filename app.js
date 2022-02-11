const express = require("express");
const dotenv = require("dotenv");
const route = require("./routes/route");
const cors = require("cors");
const { executeCentralRecovery, executeSideRecovery } = require("./controllers/executeRecovery");
const runInParallel = require("express-parallel-middleware-loader");

dotenv.config({ path: ".env" });

const app = express();
app.use(express.json());
app.use(cors());

//app.use();
app.use("/api/movies/", runInParallel([executeCentralRecovery, executeSideRecovery, route]));
module.exports = app;

// Years with the Number of Movies

// Most Popular Genre

// Most Popular Director
