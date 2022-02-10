const { node1, node2, node3 } = require("../database/node.config");
const mysql = require("mysql2/promise");
require("dotenv").config();

exports.getMovieCentral = async (req, res, next) => {
    const id = req.params.id;
    //console.log(id);

    try {
        const node1Conn = await mysql.createConnection(node1);

        // set transaction level to env variable
        await node1Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${process.env.TRANSACTION_LEVEL}`);

        // start transaction
        await node1Conn.beginTransaction();
        const result = await node1Conn.query(`SELECT * FROM ${process.env.TABLE_NAME} WHERE uuid = '${id}'`);
        // end transaction
        await node1Conn.commit();
        res.status(200).json({
            status: "Success",
            data: { ...result[0][0] },
            length: 1,
        });
    } catch (e) {
        console.log("There was an error communicating with the main node");
        next();
    }
};

exports.getMovieNode2 = async (req, res, next) => {
    const id = req.params.id;
    //console.log(id);

    try {
        const node2Conn = await mysql.createConnection(node2);

        // set transaction level to env variable
        await node2Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${process.env.TRANSACTION_LEVEL}`);

        // start transaction
        await node2Conn.beginTransaction();
        const result = await node2Conn.query(`SELECT * FROM ${process.env.TABLE_NAME} WHERE uuid = '${id}'`);
        // end transaction
        await node2Conn.commit();
        console.log(result[0]);
        if (result[0].length === 0) return next();
        res.status(200).json({
            status: "Success",
            data: { ...result[0][0] },
            length: 1,
        });
    } catch (e) {
        console.log("There was an error communicating with the node 2");
        next();
    }
};

exports.getMovieNode3 = async (req, res, next) => {
    const id = req.params.id;

    try {
        const node3Conn = await mysql.createConnection(node3);

        // set transaction level to env variable
        await node3Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${process.env.TRANSACTION_LEVEL}`);

        // start transaction
        await node3Conn.beginTransaction();
        const result = await node3Conn.query(`SELECT * FROM ${process.env.TABLE_NAME} WHERE uuid = '${id}'`);
        // end transaction
        if (result[0].length === 0) throw new Error("Not found");
        await node3Conn.commit();
        res.status(200).json({
            status: "Success",
            data: { ...result[0][0] },
            length: 1,
        });
    } catch (e) {
        console.log("There was an error communicating with the node 3");
        res.status(404).json({
            status: "Fail",
            message: "Not Found",
        });
    }
};

/**
 * READ ALL / = index.js (pagination)
 * ADD /movies =  /movies/index.js
 * READ 1, UPDATE, DELETE /movies/6edd0152-8a57-11ec-a72c-025dd59827c6 = /movies/[id].js
 *
 *
 */

/**
 * 1000
 * 1001
 * 1001
 *
 */
