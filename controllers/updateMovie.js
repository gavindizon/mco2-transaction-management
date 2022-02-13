const { node1, node2, node3 } = require("../database/node.config");
const mysql = require("mysql2/promise");
require("dotenv").config();

exports.updateMovieCentral = async (req, res, next) => {
    console.log("🤝 (1) UPDATING TO CENTRAL");

    const { name, year, genre1, genre2, genre3, director, txLvl } = req.body;
    res.locals.body = req.body;
    const uuid = req.params.id;
    res.locals.node1_failure = false;
    res.locals.node2_failure = false;
    res.locals.node3_failure = false;
    let updateQuery = `UPDATE ${process.env.TABLE_NAME}`;
    let values = `SET name = '${name}', year = ${year}, genre1 = '${genre1}', genre2 = '${genre2}', genre3 = '${genre3}', director = '${director}'`;
    let where = `WHERE uuid = '${uuid}'`;

    res.locals.updateQuery = updateQuery;
    res.locals.values = values;
    res.locals.where = where;

    let setTx = txLvl === null ? "SERIALIZABLE" : txLvl;
    res.locals.setTx = setTx;

    try {
        const node1Conn = await mysql.createConnection(node1);
        await node1Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${setTx}`);
        await node1Conn.beginTransaction();
        const result = await node1Conn.query(`${updateQuery} ${values} ${where}`);
        await node1Conn.commit();
        await node1Conn.end();
    } catch (e) {
        console.log("⚡️ NODE 1:Update Failed make sure to log this");
        res.locals.node1_failure = true;
    } finally {
        next();
    }
};

exports.updateMovieSide = async (req, res, next) => {
    const { year, txLvl } = req.body;
    //const uuid = req.params.id;
    const { updateQuery, values, where, setTx } = res.locals;
    const toNode2 = 1980 > parseInt(year);

    setTx = res.locals.setTx || txLvl || "SERIALIZABLE";

    console.log(`🤝 (2) UPDATING TO SIDE NODE ${toNode2 ? 2 : 3}`);
    try {
        const nodeConn = await mysql.createConnection(toNode2 ? node2 : node3);
        await nodeConn.execute(`SET TRANSACTION ISOLATION LEVEL ${setTx}`);
        await nodeConn.beginTransaction();
        await nodeConn.query(`${updateQuery} ${values} ${where}`);
        await nodeConn.commit();
        await nodeConn.end();
    } catch (e) {
        console.log(`⚡️ NODE ${toNode2 ? 2 : 3}: Adding Failed`);
        toNode2 ? (res.locals.node2_failure = true) : (res.locals.node3_failure = true);
    } finally {
        next();
    }
};

exports.updateMovieLogFailure = async (req, res, next) => {
    console.log("🤝 (3) CHECKING FAILURE IN UPDATE");

    let { year, txLvl } = res.locals?.body || req.body;
    const { node1_failure, node2_failure, node3_failure } = res.locals;
    year = parseInt(year);
    const { values, where, setTx } = res.locals;

    setTx = setTx || txLvl || "SERIALIZABLE";
    const logQuery = `INSERT INTO log (operation, node, value) VALUES (?, ?, ?)`;

    console.log("TX LVL:", setTx);

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
            await node1Conn.query(`${logQuery}`, ["UPDATE", year < 1980 ? 2 : 3, `${values} ${where}`]);
            await node1Conn.commit();
            await node1Conn.end();

            res.status(201).json({
                status: "Partial Success",
                data: [1, 0],
            });
        } else {
            // if all fails
            if (node2_failure && node3_failure)
                return res.status(201).json({
                    status: "Fail",
                    data: [0, 0],
                });

            console.log(`🤝 (4) LOGGING NODE 1 FAILURES AT NODE ${year < 1980 ? 2 : 3} `);
            let nodeConn = await mysql.createConnection(year < 1980 ? node2 : node3);
            await nodeConn.execute(`SET TRANSACTION ISOLATION LEVEL ${setTx}`);
            await nodeConn.beginTransaction();
            await nodeConn.query(`${logQuery}`, ["UPDATE", 1, `${values} ${where}`]);
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
