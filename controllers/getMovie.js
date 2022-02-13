const { node1, node2, node3 } = require("../database/node.config");
const mysql = require("mysql2/promise");
require("dotenv").config();

exports.getMovieCentral = async (req, res, next) => {
    console.log("🤝 (1) GETTING A MOVIE CENTRAL");

    const id = req.params.id;
    const setTx = req.query.txLvl || "SERIALIZABLE";
    res.locals.setTx = setTx;

    console.log("TX LVL:", setTx);
    try {
        const node1Conn = await mysql.createConnection(node1);
        await node1Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${setTx}`);
        await node1Conn.beginTransaction();
        const result = await node1Conn.query(`SELECT * FROM ${process.env.TABLE_NAME} WHERE uuid = '${id}'`);
        await node1Conn.commit();
        await node1Conn.end();

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
    console.log("🤝 (2) TRYING TO GET THE MOVIE ON NODE 2");

    const id = req.params.id;
    const setTx = res.locals.setTx || req.query.txLvl || "SERIALIZABLE";

    try {
        const node2Conn = await mysql.createConnection(node2);
        await node2Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${setTx}`);
        await node2Conn.beginTransaction();
        const result = await node2Conn.query(`SELECT * FROM ${process.env.TABLE_NAME} WHERE uuid = '${id}'`);
        await node2Conn.commit();
        await node2Conn.end();

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
    console.log("🤝 (3) TRYING TO GET THE MOVIE ON NODE 3");

    const id = req.params.id;
    const setTx = res.locals.setTx || req.query.txLvl || "SERIALIZABLE";

    try {
        const node3Conn = await mysql.createConnection(node3);
        await node3Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${setTx}`);
        await node3Conn.beginTransaction();
        const result = await node3Conn.query(`SELECT * FROM ${process.env.TABLE_NAME} WHERE uuid = '${id}'`);
        if (result[0].length === 0) throw new Error("Not found");
        await node3Conn.commit();
        await node3Conn.end();

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
