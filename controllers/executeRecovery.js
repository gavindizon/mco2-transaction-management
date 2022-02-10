const { createQuery } = require("../helpers/createQuery");

const { node1, node2, node3 } = require("../database/node.config");
const mysql = require("mysql2/promise");
require("dotenv").config();

// RECOVERY LOGS from Node 2 and 3 to Node 1
exports.executeCentralRecovery = async (req, res, next) => {
    const nodes = [node2, node3];

    try {
        let node1Conn = await mysql.createConnection(node1);

        for (let node of nodes) {
            // RETRIEVE log from nodes
            let nodeConn = await mysql.createConnection(node);
            try {
                await nodeConn.beginTransaction();
                const results = await nodeConn.query(`SELECT * FROM log`);
                // ADD TO NODE 1
                await node1Conn.beginTransaction();
                for (let result of results[0]) {
                    // console.log(result);
                    await node1Conn.query(createQuery(result.operation, result.value));
                }
                // DELETE LOGS FROM NODE
                await nodeConn.query(`DELETE FROM log`);
                await node1Conn.commit();
                await nodeConn.commit();
            } catch (e) {
                node1Conn.rollback();
                nodeConn.rollback();
                console.log(e);
            }
        }
    } catch (e) {
        //console.log(e);
    } finally {
        next();
    }
};

exports.executeSideRecovery = async (req, res, next) => {
    const nodes = [node2, node3];

    try {
        let node1Conn = await mysql.createConnection(node1);

        for (let node of nodes) {
            let nodeNumber = node.database === "mco2_node2" ? 2 : 3;
            // GET CONNECTION
            let nodeConn = await mysql.createConnection(node);
            try {
                // RETRIEVE log from nodes
                await node1Conn.beginTransaction();
                const results = await node1Conn.query(`SELECT * FROM log WHERE node = ${nodeNumber}`);
                // ADD TO NODE N
                await nodeConn.beginTransaction();
                for (let result of results[0]) {
                    // console.log(result);
                    await nodeConn.query(createQuery(result.operation, result.value));
                }
                // DELETE LOGS FROM NODE
                await node1Conn.query(`DELETE FROM log WHERE node = ${nodeNumber}`);
                await node1Conn.commit();
                await nodeConn.commit();
            } catch (e) {
                node1Conn.rollback();
                nodeConn.rollback();
                console.log(e);
            }
        }
    } catch (e) {
    } finally {
        next();
    }
};
