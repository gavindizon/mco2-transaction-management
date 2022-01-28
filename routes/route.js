const express = require("express");
const { getMovies, addMovie } = require("../controllers/transactions");
const router = express.Router();

router.route("/").get(getMovies).post(addMovie);

module.exports = router;
