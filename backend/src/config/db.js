// Pool kết nối MySQL/MariaDB (XAMPP). DECIMAL trả về kiểu số (decimalNumbers) để tính tiền trực tiếp.
const mysql = require('mysql2/promise');
const { db } = require('./env');

const pool = mysql.createPool({
  host: db.host,
  port: db.port,
  user: db.user,
  password: db.password,
  database: db.database,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  decimalNumbers: true,
});

module.exports = pool;
