const mysql = require("mysql2/promise");
const { node1, node2, node3 } = require("./node.config");

const node1_conn = mysql.createConnection(node1);
const node2_conn = mysql.createConnection(node2);
const node3_conn = mysql.createConnection(node3);

module.exports = { node1_conn, node2_conn, node3_conn };
