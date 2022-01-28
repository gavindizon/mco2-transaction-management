const mysql = require("mysql2");
const node_1_config = require("./node1_config");

const node1 = mysql.createConnection(node_1_config);

module.exports = node1;
