const express = require("express");
const { addMovieCentral, addMovieSide, addMovieLogFailure } = require("../controllers/addMovie");
const { getMovieCentral, getMovieNode2, getMovieNode3 } = require("../controllers/getMovie");
const { getMoviesCentral, getMoviesSide } = require("../controllers/getMovies");

const router = express.Router();

router.route("/").get(getMoviesCentral, getMoviesSide).post(addMovieCentral, addMovieSide, addMovieLogFailure);
router.route("/:id").get(getMovieCentral, getMovieNode2, getMovieNode3);

module.exports = router;
