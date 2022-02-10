const express = require("express");
const { addMovieCentral, addMovieSide, addMovieLogFailure } = require("../controllers/addMovie");
const { getMoviesCentral, getMoviesSide } = require("../controllers/getMovies");

const router = express.Router();

router.route("/").get(getMoviesCentral, getMoviesSide).post(addMovieCentral, addMovieSide, addMovieLogFailure);
//router.route("/:id");

module.exports = router;
