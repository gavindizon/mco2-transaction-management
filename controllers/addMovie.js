const { node1, node2, node3 } = require("../database/node.config");
const mysql = require("mysql2/promise");
const { v1: uuidv1, v4: uuidv4 } = require("uuid");
require("dotenv").config();

const insertQuery = `INSERT INTO ${process.env.TABLE_NAME} (uuid, name, year, genre1, genre2, genre3, director) VALUES (?, ?, ?, ?, ?, ?, ?)`;

exports.addMovieCentral = async (req, res, next) => {
    console.log("🤝 (1) ADDING TO CENTRAL");

    const { name, year, genre1, genre2, genre3, director, txLvl } = req.body;
    res.locals.body = req.body;
    res.locals.node1_failure = false;
    res.locals.node2_failure = false;
    res.locals.node3_failure = false;

    const uuid = uuidv4();
    res.locals.uuid = uuid;

    let setTx = txLvl === null ? "SERIALIZABLE" : txLvl;
    res.locals.setTx = setTx;

    try {
        const node1Conn = await mysql.createConnection(node1);
        await node1Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${setTx}`);
        await node1Conn.beginTransaction();
        const result = await node1Conn.query(insertQuery, [uuid, name, year, genre1, genre2, genre3, director]);
        await node1Conn.commit();
        await node1Conn.end();
    } catch (e) {
        console.log("⚡️ NODE 1:Adding Failed make sure to log this");
        res.locals.node1_failure = true;
    } finally {
        next();
    }
};

exports.addMovieSide = async (req, res, next) => {
    const { name, year, genre1, genre2, genre3, director, txLvl } = res.locals.body || req.body;
    const toNode2 = 1980 > parseInt(year);
    const uuid = res?.locals?.uuid || uuidv4();
    let setTx = res.locals.setTx || txLvl || "SERIALIZABLE";

    console.log(`🤝 (2) ADDING TO SIDE NODE ${toNode2 ? 2 : 3}`);
    try {
        const nodeConn = await mysql.createConnection(toNode2 ? node2 : node3);
        await nodeConn.execute(`SET TRANSACTION ISOLATION LEVEL ${setTx}`);
        await nodeConn.beginTransaction();
        await nodeConn.query(insertQuery, [uuid, name, year, genre1, genre2, genre3, director]);
        await nodeConn.commit();
        await nodeConn.end();
    } catch (e) {
        console.log(`⚡️ NODE ${toNode2 ? 2 : 3}: Adding Failed`);
        toNode2 ? (res.locals.node2_failure = true) : (res.locals.node3_failure = true);
    } finally {
        next();
    }
};

exports.addMovieLogFailure = async (req, res, next) => {
    console.log("🤝 (3) CHECKING FAILURE IN ADD");

    let { name, year, genre1, genre2, genre3, director, txLvl } = res.locals?.body || req.body;
    let { node1_failure, node2_failure, node3_failure, uuid, setTx } = res.locals;
    year = parseInt(year);

    setTx = setTx || txLvl || "SERIALIZABLE";

    const values = `('${uuid}', '${name}', ${year}, '${genre1}', '${genre2}', '${genre3}', '${director}')`;
    const logQuery = `INSERT INTO log (operation, node, value) VALUES (?, ?, ?)`;
    try {
        // if no failure to node 1
        if (!node1_failure) {
            if (!node2_failure && !node3_failure)
                return res.status(201).json({
                    status: "Success",
                    data: [1, 1],
                });

            console.log(`🤝 (4) LOGGING NODE ${year < 1980 ? 2 : 3} FAILURES AT NODE 1`);
            const node1Conn = await mysql.createConnection(node1);
            await node1Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${setTx}`);
            await node1Conn.beginTransaction();
            await node1Conn.query(`${logQuery}`, ["ADD", year < 1980 ? 2 : 3, values]);
            await node1Conn.commit();
            await node1Conn.end();

            res.status(201).json({
                status: "Partial Success",
                data: [1, 0],
            });
        } else {
            // if all fails
            console.log("NODE 1 GOES HERE");
            if (node2_failure && node3_failure)
                return res.status(201).json({
                    status: "Fail",
                    data: [0, 0],
                });

            console.log(`🤝 (4) LOGGING NODE 1 FAILURES AT NODE ${year < 1980 ? 2 : 3} `);

            let nodeConn = await mysql.createConnection(year < 1980 ? node2 : node3);
            await nodeConn.execute(`SET TRANSACTION ISOLATION LEVEL ${setTx}`);
            await nodeConn.beginTransaction();
            await nodeConn.query(`${logQuery}`, ["ADD", 1, values]);
            await nodeConn.commit();
            await nodeConn.end();

            res.status(201).json({
                status: "Partial Success",
                data: [0, 1],
            });
        }
    } catch (e) {
        console.log(e);
        res.status(201).json({
            status: "Fail",
            data: e,
        });
    }
};
