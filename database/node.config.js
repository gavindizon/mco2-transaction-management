require("dotenv").config();

const node1 = {
    host: process.env.HOSTNAME_NODE_1,
    user: process.env.USERNAME_NODE_1,
    password: process.env.PASSWORD_NODE_1,
    port: 3306,
    database: process.env.DATABASE_NODE_1,
    connectTimeout: 4500,
};

const node2 = {
    host: process.env.HOSTNAME_NODE_2,
    user: process.env.USERNAME_NODE_2,
    password: process.env.PASSWORD_NODE_2,
    port: 3306,
    database: process.env.DATABASE_NODE_2,
    connectTimeout: 4500,
};

const node3 = {
    host: process.env.HOSTNAME_NODE_3,
    user: process.env.USERNAME_NODE_3,
    password: process.env.PASSWORD_NODE_3,
    port: 3306,
    database: process.env.DATABASE_NODE_3,
    connectTimeout: 4500,
};

module.exports = { node1, node2, node3 };
