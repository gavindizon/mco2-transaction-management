const express = require("express");
const { addMovieCentral, addMovieSide, addMovieLogFailure } = require("../controllers/addMovie");
const { deleteMovieCentral, deleteMovieSide, deleteMovieLogFailure } = require("../controllers/deleteMovie");
const { getMovieCentral, getMovieNode2, getMovieNode3 } = require("../controllers/getMovie");
const { getMoviesCentral, getMoviesSide } = require("../controllers/getMovies");
const { updateMovieCentral, updateMovieSide, updateMovieLogFailure } = require("../controllers/updateMovie");

const router = express.Router();

router.route("/").get(getMoviesCentral, getMoviesSide).post(addMovieCentral, addMovieSide, addMovieLogFailure);
router
    .route("/:id")
    .get(getMovieCentral, getMovieNode2, getMovieNode3)
    .put(updateMovieCentral, updateMovieSide, updateMovieLogFailure)
    .delete(deleteMovieCentral, deleteMovieSide, deleteMovieLogFailure);

module.exports = router;
