const mysql = require('mysql');

const { MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_DATABASE } = require('../config');

const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: MYSQL_USERNAME,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE
})

module.exports = pool;