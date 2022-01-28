const mysql = require("mysql2");
const { Client } = require("ssh2");
const fs = require("fs");
const dotenv = require("dotenv");
const sshClient = new Client();

dotenv.config();

const dbConfig = {
    host: process.env.MYSQL_DB_HOST_NODE_3,
    port: process.env.MYSQL_DB_PORT_NODE_3,
    user: process.env.MYSQL_USERNAME_NODE_3,
    password: process.env.MYSQL_PASSWORD_NODE_3,
    database: process.env.MYSQL_DB_NODE_3,
};

const sshConfig = {
    host: process.env.SSH_HOSTNAME_NODE_3,
    port: 22,
    user: process.env.SSH_USERNAME_NODE_3,
    password: process.env.SSH_PASSWORD_NODE_3,
};

const forwardConfig = {
    srcHost: "127.0.0.1", // any valid address
    srcPort: 3307, // any valid port
    dstHost: dbConfig.host, // destination database
    dstPort: dbConfig.port, // destination port
};

const SSHConnection = new Promise((resolve, reject) => {
    sshClient
        .on("error", (err) => {
            console.log(dbConfig, sshConfig);
            console.log(err.message);
        })
        .on("ready", () => {
            sshClient.forwardOut(
                forwardConfig.srcHost,
                forwardConfig.srcPort,
                forwardConfig.dstHost,
                forwardConfig.dstPort,
                (err, stream) => {
                    console.log("⚡️ 1000");
                    if (err) reject(err);
                    const updatedDbServer = {
                        ...dbConfig,
                        stream,
                    };
                    const connection = mysql.createConnection(updatedDbServer);
                    connection.connect((error) => {
                        if (error) {
                            reject(error);
                        }
                        resolve(connection);
                    });
                }
            );
        })
        .connect(sshConfig);
});

module.exports = SSHConnection;
