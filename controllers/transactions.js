const node1_config = require("../database/node1_config");

exports.getMovies = async (req, res, next) => {
    try {
        let movies = [];

        // node1.query("SELECT * FROM `movies`", (err, res, fields) => {
        //     console.log("RES", res);
        //     console.log("FIELDS", fields);
        // });

        // node1_config.then((v) => {
        // v.query("SELECT * FROM `movies`", (err, res, fields) => {
        //     movies = res;
        // });
        // });

        const ress = await node1_config;

        ress.query("SELECT * FROM `movies`", (err, results, fields) => {
            res.status(200).json({
                status: "Success",
                data: results,
            });
        });

        // conn2.then((v) => {
        //     console.log("TESTING 2");
        // });

        // conn3.then((v) => {
        //     console.log("TESTING 3");
        // });
    } catch (e) {
        console.log(e);
        res.status(500).json({
            status: "Fail",
            message: e,
        });
    }
};

exports.addMovie = async (req, res, next) => {
    const movie = {};

    try {
        res.status(201).json({
            status: "Success",
            data: movie,
        });
    } catch (e) {
        res.status(500).json({
            status: "Fail",
            message: e,
        });
    }
};
