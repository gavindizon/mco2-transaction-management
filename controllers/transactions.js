const { node1, node2, node3 } = require("../database/node.config");
const mysql = require("mysql2/promise");
const { v1: uuidv1, v4: uuidv4 } = require("uuid");
const e = require("express");
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
const insertQuery = `INSERT INTO ${process.env.TABLE_NAME} (uuid, name, year, genre1, genre2, genre3, director) VALUES (?, ?, ?, ?, ?, ?, ?)`;

exports.addMovieCentral = async (req, res, next) => {
    const { name, year, genre1, genre2, genre3, director } = req.body;
    res.locals.body = req.body;

    res.locals.node1_failure = false;
    res.locals.node2_failure = false;
    res.locals.node3_failure = false;
    const uuid = uuidv4();
    res.locals.uuid = uuid;

    try {
        const node1Conn = await mysql.createConnection(node1);
        await node1Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${process.env.TRANSACTION_LEVEL}`);
        await node1Conn.beginTransaction();
        const result = await node1Conn.query(insertQuery, [uuid, name, year, genre1, genre2, genre3, director]);
        await node1Conn.commit();
    } catch (e) {
        console.log("⚡️ NODE 1:Adding Failed make sure to log this");
        res.locals.node1_fail = true;
    } finally {
        next();
    }
};

exports.addMovieSide = async (req, res, next) => {
    const { name, year, genre1, genre2, genre3, director } = res.locals?.body || req.body;

    const toNode2 = 1980 > parseInt(year);
    const uuid = res?.locals?.uuid || uuidv4();

    try {
        if (toNode2) {
            // node 2
            const node2Conn = await mysql.createConnection(node2);
            await node2Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${process.env.TRANSACTION_LEVEL}`);
            await node2Conn.beginTransaction();
            await node2Conn.query(insertQuery, [uuid, name, year, genre1, genre2, genre3, director]);
            await node2Conn.commit();
        } else {
            // node 3
            const node3Conn = await mysql.createConnection(node3);
            await node3Conn.execute(`SET TRANSACTION ISOLATION LEVEL ${process.env.TRANSACTION_LEVEL}`);
            await node3Conn.beginTransaction();
            await node3Conn.query(insertQuery, [uuid, name, year, genre1, genre2, genre3, director]);
            await node3Conn.commit();
        }
        res.status(201).json({
            status: "Success",
        });
    } catch (e) {
        console.error(e);
        if (toNode2) {
            console.log("⚡️ NODE 2:Adding Failed make sure to log this");
            res.locals.node2_failure = true;
        } else {
            console.log("⚡️ NODE 3:Adding Failed make sure to log this");
            res.locals.node3_failure = true;
        }
        res.status(500).json({
            status: "Failure",
        });
    } finally {
        next();
    }
};

exports.addMovieLogFailure = async (req, res, next) => {
    const { name, year, genre1, genre2, genre3, director } = res.locals?.body || req.body;
    const { node1_failure, node2_failure, node3_failure, uuid } = res.locals;
    year = parseInt(year);
    const values = `('${uuid}', '${name}', ${year}, '${genre1}', '${genre2}', '${genre3}', '${director}')`;
    const logQuery = `INSERT INTO log (operation, node, value)`;
    try {
        // if no failure to node 1
        if (!node1_failure) {
            if (year < 1980) {
                if (node2_failure) {
                    // if node 1 was accomplished but node2 failed -> log to node1

                    const node1Conn = await mysql.createConnection(node1);

                    await node1Conn.beginTransaction();
                    await node1Conn.query(`${logQuery}`, ["ADD", 2, values]);
                    await node1Conn.commit();

                    res.status(201).json({
                        status: "Partial Success",
                        data: [1, 0],
                    });
                } else {
                    // if no failures
                    res.status(201).json({
                        status: "Success",
                        data: [1, 1],
                    });
                }
            } else {
            }
        } else {
        }
    } catch (e) {}
};
