const { node1, node2, node3 } = require("../database/node.config");
const mysql = require("mysql2/promise");
require("dotenv").config();

exports.getMoviesCentral = async (req, res, next) => {
    let offset = req?.query.page ? req.query.page - 1 : 0;
    res.locals.offset = offset;

    try {
        const node1Conn = await mysql.createConnection(node1);

        // set transaction level to env variable
        await node1Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${process.env.TRANSACTION_LEVEL}`);

        // start transaction
        await node1Conn.beginTransaction();

        const result = await node1Conn.query(
            `SELECT * FROM ${process.env.TABLE_NAME} ORDER BY name LIMIT ${offset * 10},10 `
        );

        // end transaction
        await node1Conn.commit();
        res.status(200).json({
            status: "Success",
            data: result[0],
            length: result[0].length,
        });
    } catch (e) {
        console.log("There was an error communicating with the main node");
    }
};

exports.getMoviesSide = async (req, res, next) => {
    // Try node 2 and 3
    let offset = res.locals.offset || req?.params?.page || 0;
    let movies = [];

    try {
        const node2Conn = await mysql.createConnection(node2);
        const node3Conn = await mysql.createConnection(node3);

        await node2Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${process.env.TRANSACTION_LEVEL}`);
        await node3Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${process.env.TRANSACTION_LEVEL}`);

        // start transaction
        await node2Conn.beginTransaction();
        await node3Conn.beginTransaction();

        const node2result = await node2Conn.query(`SELECT * FROM ${process.env.TABLE_NAME}`);
        const node3result = await node3Conn.query(`SELECT * FROM ${process.env.TABLE_NAME}`);

        // end transaction
        await node2Conn.commit();
        await node3Conn.commit();

        //process data
        movies = node2result[0].concat(node3result[0]);

        // sort by name
        movies.sort((a, b) => (a.name < b.name ? -1 : 1));

        //      console.log(movies);

        console.log(offset);
        movies = movies.slice(offset * 10, offset * 10 + 10);

        //        console.log(movies);

        res.status(200).json({
            status: "Success",
            data: movies,
            length: movies.length,
        });
    } catch (er) {
        console.error(er);
        res.status(500).json({
            status: "Failure",
            data: [],
            length: 0,
        });
    }
};
