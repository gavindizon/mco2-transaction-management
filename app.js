const express = require("express");
const dotenv = require("dotenv");
const route = require("./routes/route");
const viewRoutes = require("./routes/views");
const cors = require("cors");
const { executeCentralRecovery, executeSideRecovery } = require("./controllers/executeRecovery");
const runInParallel = require("express-parallel-middleware-loader");
const hbs = require("express-hbs");

dotenv.config({ path: ".env" });

const app = express();
app.use(express.json());
app.use(cors());

app.engine(
    "hbs",
    hbs.express4({
        partialsDir: __dirname + "/views/partials",
    })
);
app.set("view engine", "hbs");

app.set("views", __dirname + "/views");

app.use("/", viewRoutes);

app.use("/api/movies/", runInParallel([executeCentralRecovery, executeSideRecovery, route]));

module.exports = app;

// Years with the Number of Movies

// Most Popular Genre

// Most Popular Director
