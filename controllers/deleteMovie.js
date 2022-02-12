const { node1, node2, node3 } = require("../database/node.config");
const mysql = require("mysql2/promise");
require("dotenv").config();

exports.deleteMovieCentral = async (req, res, next) => {
    console.log("🤝 (1) DELETING TO CENTRAL");

    let setTx = req.body.txLvl || "SERIALIZABLE";
    res.locals.setTx = setTx;

    const uuid = req.params.id;
    res.locals.node1_failure = false;
    res.locals.node2_failure = false;
    res.locals.node3_failure = false;
    let deleteQuery = `DELETE FROM ${process.env.TABLE_NAME}`;
    let where = `WHERE uuid = '${uuid}'`;

    res.locals.deleteQuery = deleteQuery;
    res.locals.where = where;

    try {
        const node1Conn = await mysql.createConnection(node1);
        await node1Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${setTx}`);
        await node1Conn.beginTransaction();
        const record = await node1Conn.query(`SELECT * FROM ${process.env.TABLE_NAME} WHERE uuid = '${uuid}'`);

        res.locals.year = record[0][0]?.year;
        const result = await node1Conn.query(`${deleteQuery} ${where}`);
        await node1Conn.commit();
    } catch (e) {
        console.log(e);
        console.log("⚡️ NODE 1: Delete Failed make sure to log this");
        res.locals.node1_failure = true;
    } finally {
        next();
    }
};

exports.deleteMovieSide = async (req, res, next) => {
    const { year } = res.locals;
    //const uuid = req.params.id;
    const { deleteQuery, where, setTx } = res.locals;

    setTx = setTx || req.body.txLvl || "SERIALIZABLE";
    const toNode2 = 1980 > parseInt(year);

    console.log(`🤝 (2) DELETING TO SIDE NODE ${toNode2 ? 2 : 3}`);
    try {
        const nodeConn = await mysql.createConnection(toNode2 ? node2 : node3);
        await nodeConn.execute(`SET TRANSACTION ISOLATION LEVEL ${setTx}`);
        await nodeConn.beginTransaction();
        await nodeConn.query(`${deleteQuery} ${where}`);
        await nodeConn.commit();
        await nodeConn.end();
    } catch (e) {
        if (toNode2) {
            console.log("⚡️ NODE 2:Deleting Failed make sure to log this");
            res.locals.node2_failure = true;
        } else {
            console.log("⚡️ NODE 3:Deleting Failed make sure to log this");
            res.locals.node3_failure = true;
        }
    } finally {
        next();
    }
};

exports.deleteMovieLogFailure = async (req, res, next) => {
    console.log("🤝 (3) CHECKING FAILURE IN DELETE");

    let { year, setTx } = res.locals;
    setTx = setTx || req.body.txLvl || "SERIALIZABLE";

    const { node1_failure, node2_failure, node3_failure } = res.locals;
    year = parseInt(year);
    const uuid = req.params.id;

    const logQuery = `INSERT INTO log (operation, node, value) VALUES (?, ?, ?)`;

    try {
        // if no failure to node 1
        if (!node1_failure) {
            if (!node2_failure && !node3_failure)
                return res.status(201).json({
                    status: "Success",
                    data: [1, 1],
                });

            console.log(`NODE ${year < 1980 ? 2 : 3} GOES HERE`);

            const node1Conn = await mysql.createConnection(node1);
            await node1Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${setTx}`);
            await node1Conn.beginTransaction();
            await node1Conn.query(`${logQuery}`, ["DELETE", year < 1980 ? 2 : 3, `${uuid}`]);
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

            let nodeConn = await mysql.createConnection(year < 1980 ? node2 : node3);
            await nodeConn.execute(`SET TRANSACTION ISOLATION LEVEL ${setTx}`);
            await nodeConn.beginTransaction();
            await nodeConn.query(`${logQuery}`, ["DELETE", 1, `${uuid}`]);
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
