require("dotenv").config();

exports.createQuery = (operation, value) => {
    let query = {
        ADD: `INSERT INTO ${process.env.TABLE_NAME} (uuid, name, year, genre1, genre2, genre3, director) VALUES ${value}`,
        UPDATE: `UPDATE ${process.env.TABLE_NAME} SET ${value}`,
        DELETE: `DELETE FROM ${process.env.TABLE_NAME} WHERE uuid = ${value}`,
    };

    return query[operation];
};
