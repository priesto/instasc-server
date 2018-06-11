const mysql = require('promise-mysql');

const env = process.env.NODE_ENV;
const { MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_DATABASE } = require('../config')[env];

const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: MYSQL_USERNAME,
    password: MYSQL_PASSWORD,
    database: MYSQL_DATABASE
})

module.exports = pool;