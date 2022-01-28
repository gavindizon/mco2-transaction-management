const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const route = require("./routes/route");
const os = require("os");

dotenv.config({ path: ".env" });

const app = express();

app.use("/api", route);
module.exports = app;
