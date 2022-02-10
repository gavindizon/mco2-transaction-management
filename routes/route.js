const express = require("express");
const { getMoviesCentral, getMoviesSide, addMovieCentral, addMovieSide } = require("../controllers/transactions");
const router = express.Router();

router.route("/").get(getMoviesSide).post(addMovieCentral, addMovieSide);
//router.route("/:id");

module.exports = router;
