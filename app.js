const express = require("express");
const dotenv = require("dotenv");
const route = require("./routes/route");

dotenv.config({ path: ".env" });

const app = express();
app.use(express.json());

app.use("/api/movies/", route);
module.exports = app;
