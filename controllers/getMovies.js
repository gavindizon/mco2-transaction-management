const { node1, node2, node3 } = require("../database/node.config");
const mysql = require("mysql2/promise");
require("dotenv").config();

exports.getMoviesCentral = async (req, res, next) => {
    console.log("🤝 (1) GETTING MOVIES CENTRAL");

    let offset = req?.query.page ? req.query.page - 1 : 0;
    res.locals.offset = offset;

    let optional = ``;
    let keyword = req?.query.search || null;

    if (keyword) optional = `WHERE name LIKE '%${keyword}%'`;
    res.locals.optional = optional;

    let setTx = req.query?.txLvl || "SERIALIZABLE";
    res.locals.setTx = setTx;

    console.log("TX LVL:", setTx);

    try {
        const node1Conn = await mysql.createConnection(node1);
        await node1Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${setTx}`);
        await node1Conn.beginTransaction();
        const result = await node1Conn.query(
            `SELECT * FROM ${process.env.TABLE_NAME} ${optional} ORDER BY name  LIMIT ${offset * 10},10 `
        );
        await node1Conn.commit();
        await node1Conn.end();

        res.status(200).json({
            status: "Success",
            data: result[0],
            length: result[0].length,
        });
    } catch (e) {
        console.log("There was an error communicating with the main node");
        next();
    }
};

exports.getMoviesSide = async (req, res, next) => {
    console.log("🤝 (2) GETTING MOVIES SIDE");

    let offset = res.locals.offset || req?.params?.page || 0;
    let movies = [];

    let setTx = res.locals.setTx || req.query?.txLvl || "SERIALIZABLE";

    try {
        const node2Conn = await mysql.createConnection(node2);
        const node3Conn = await mysql.createConnection(node3);

        await node2Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${setTx}`);
        await node3Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${setTx}`);

        // start transaction
        await node2Conn.beginTransaction();
        await node3Conn.beginTransaction();

        const node2result = await node2Conn.query(`SELECT * FROM ${process.env.TABLE_NAME} ${res.locals.optional}`);
        const node3result = await node3Conn.query(`SELECT * FROM ${process.env.TABLE_NAME} ${res.locals.optional}`);

        // end transaction
        await node2Conn.commit();
        await node3Conn.commit();

        await node2Conn.end();
        await node3Conn.end();

        //process data
        movies = node2result[0].concat(node3result[0]);

        // sort by name
        movies.sort((a, b) => (a.name < b.name ? -1 : 1));

        movies = movies.slice(offset * 10, offset * 10 + 10);

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
