const { createQuery } = require("../helpers/createQuery");

const { node1, node2, node3 } = require("../database/node.config");
const mysql = require("mysql2/promise");
require("dotenv").config();

// RECOVERY LOGS from Node 2 and 3 to Node 1
exports.executeCentralRecovery = async (req, res, next) => {
    console.log("[🔧] EXECUTING CENTRAL RECOVERY");
    const nodes = [node2, node3];

    try {
        let node1Conn = await mysql.createConnection(node1);
        await node1Conn.beginTransaction();

        for (let node of nodes) {
            // RETRIEVE log from nodes
            let nodeConn = await mysql.createConnection(node);
            try {
                const results = await nodeConn.query(`SELECT * FROM log`);
                // ADD TO NODE 1
                for (let result of results[0]) {
                    // console.log(result);
                    await node1Conn.query(createQuery(result.operation, result.value));
                }

                // DELETE LOGS FROM NODE
                await nodeConn.query(`DELETE FROM log`);

                console.log("FINISH CENTRAL RECOVERY");
            } catch (e) {
                console.log("[🔧] CENTRAL RECOVERY FAILED");
                console.log("[🔧]", e);
            }
        }
        await node1Conn.commit();
        await node1Conn.end();
    } catch (e) {
        console.log("[🔧]", e);
    }
};

exports.executeSideRecovery = async (req, res, next) => {
    setTimeout(() => {}, 5000);

    const nodes = [node2, node3];

    console.log("[🔧] EXECUTING SIDE RECOVERY");

    try {
        let node1Conn = await mysql.createConnection(node1);
        await node1Conn.beginTransaction();

        for (let node of nodes) {
            let nodeNumber = node.database === "mco2_node2" ? 2 : 3;
            // GET CONNECTION
            let nodeConn = await mysql.createConnection(node);

            try {
                // RETRIEVE log from nodes
                const results = await node1Conn.query(`SELECT * FROM log WHERE node = ${nodeNumber}`);
                // ADD TO NODE N
                for (let result of results[0]) {
                    // console.log(result);
                    await nodeConn.query(createQuery(result.operation, result.value));
                }
                // DELETE LOGS FROM NODE
                await node1Conn.query(`DELETE FROM log WHERE node = ${nodeNumber}`);

                await nodeConn.end();
                console.log("FINISH SIDE RECOVERY");
            } catch (e) {
                console.log("[🔧] SIDE RECOVERY FAILED");
                console.log("[🔧]", e);
            }
        }
        await node1Conn.commit();
        await node1Conn.end();
    } catch (e) {
        console.log("[🔧]", e);
    }
};
