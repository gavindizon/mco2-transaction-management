const { node1, node2, node3 } = require("../database/node.config");
const mysql = require("mysql2/promise");
require("dotenv").config();

//const insertQuery = `INSERT INTO ${process.env.TABLE_NAME} (uuid, name, year, genre1, genre2, genre3, director) VALUES (?, ?, ?, ?, ?, ?, ?)`;

exports.updateMovieCentral = async (req, res, next) => {
    const { name, year, genre1, genre2, genre3, director } = req.body;
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

    try {
        const node1Conn = await mysql.createConnection(node1);
        await node1Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${process.env.TRANSACTION_LEVEL}`);
        await node1Conn.beginTransaction();
        const result = await node1Conn.query(`${updateQuery} ${values} ${where}`);
        await node1Conn.commit();
    } catch (e) {
        console.log("⚡️ NODE 1:Update Failed make sure to log this");
        res.locals.node1_failure = true;
    } finally {
        next();
    }
};

exports.updateMovieSide = async (req, res, next) => {
    console.log("UPDATING SIDE");
    const { year } = req.body;
    //const uuid = req.params.id;
    const { updateQuery, values, where } = res.locals;

    const toNode2 = 1980 > parseInt(year);
    try {
        if (toNode2) {
            // node 2
            const node2Conn = await mysql.createConnection(node2);
            await node2Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${process.env.TRANSACTION_LEVEL}`);
            await node2Conn.beginTransaction();
            await node2Conn.query(`${updateQuery} ${values} ${where}`);
            await node2Conn.commit();
        } else {
            // node 3
            const node3Conn = await mysql.createConnection(node3);
            await node3Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${process.env.TRANSACTION_LEVEL}`);
            await node3Conn.beginTransaction();
            await node3Conn.query(`${updateQuery} ${values} ${where}`);
            await node3Conn.commit();
        }
    } catch (e) {
        if (toNode2) {
            console.log("⚡️ NODE 2:Adding Failed make sure to log this");
            res.locals.node2_failure = true;
        } else {
            console.log("⚡️ NODE 3:Adding Failed make sure to log this");
            res.locals.node3_failure = true;
        }
    } finally {
        next();
    }
};

exports.updateMovieLogFailure = async (req, res, next) => {
    let { year } = res.locals?.body || req.body;
    const { node1_failure, node2_failure, node3_failure } = res.locals;
    year = parseInt(year);
    const { values, where } = res.locals;

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
            await node1Conn.query(`${logQuery}`, ["UPDATE", year < 1980 ? 2 : 3, `${values} ${where}`]);
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

            await nodeConn.query(`${logQuery}`, ["UPDATE", 1, `${values} ${where}`]);
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
