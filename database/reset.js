const mysql = require("mysql2/promise");
const { node1, node2, node3 } = require("./node.config");

// resets test table (through denormalized table) and truncates log table
(async function () {
    let result = [];
    try {
        const node1Conn = await mysql.createConnection(node1);
        const node2Conn = await mysql.createConnection(node2);
        const node3Conn = await mysql.createConnection(node3);
        let conns = [node1Conn, node2Conn, node3Conn];
        console.log("ESTABLISHED CONNECTIONS");
        try {
            for (let conn of conns) await conn.beginTransaction();

            for (let conn of conns) {
                await conn.execute("TRUNCATE TABLE test");
                await conn.execute("INSERT test SELECT * FROM denormalized");
                result.push(await conn.execute("SELECT COUNT(*) FROM test"));
                await conn.execute("TRUNCATE TABLE log");
                result.push(await conn.execute("SELECT COUNT(*) FROM log"));
            }

            for (let [i, r] of result.entries()) {
                //console.log("TEST", r, i);
                console.log(r[0][0]["COUNT(*)"]);
            }
            /**
             * SHOULD BE
             * 388269
             * 0
             * 200600
             * 0
             * 187699
             * 0
             */
            for (let conn of conns) await conn.commit();
        } catch (e) {
            console.log(e);
            node1Conn.rollback();
            node2Conn.rollback();
            node3Conn.rollback();
        } finally {
            node1Conn.end();
            node2Conn.end();
            node3Conn.end();
        }
    } catch (e) {
        console.log(e);
    } finally {
        process.exit();
    }
})();
