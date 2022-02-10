const { node1, node2, node3 } = require("../database/node.config");
const mysql = require("mysql2/promise");
require("dotenv").config();

exports.deleteMovieCentral = async (req, res, next) => {
    console.log("DELETING CENTRAL");
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
        await node1Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${process.env.TRANSACTION_LEVEL}`);
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
    console.log("DELETING SIDE");
    const { year } = res.locals;
    //const uuid = req.params.id;
    const { deleteQuery, where } = res.locals;

    const toNode2 = 1980 > parseInt(year);
    try {
        if (toNode2) {
            // node 2
            console.log("Connect to Delete Node 2");
            const node2Conn = await mysql.createConnection(node2);
            await node2Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${process.env.TRANSACTION_LEVEL}`);
            await node2Conn.beginTransaction();
            await node2Conn.query(`${deleteQuery} ${where}`);
            await node2Conn.commit();
        } else {
            // node 3
            const node3Conn = await mysql.createConnection(node3);
            await node3Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${process.env.TRANSACTION_LEVEL}`);
            await node3Conn.beginTransaction();
            await node3Conn.query(`${deleteQuery} ${where}`);
            await node3Conn.commit();
        }
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
    let { year } = res.locals;
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
            await node1Conn.beginTransaction();
            await node1Conn.query(`${logQuery}`, ["DELETE", year < 1980 ? 2 : 3, `${uuid}`]);
            await node1Conn.commit();

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
            console.log("1");
            await nodeConn.beginTransaction();
            console.log("2");

            await nodeConn.query(`${logQuery}`, ["DELETE", 1, `${uuid}`]);
            console.log("3");

            await nodeConn.commit();

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
