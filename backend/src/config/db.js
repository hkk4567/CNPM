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

// Câu lệnh đơn lẻ chạy thẳng trên pool (autocommit, không nằm trong withTransaction): nếu bị deadlock/đổi định nghĩa bảng thì
// CSDL đã hủy cả câu lệnh, chạy lại là an toàn. Giao dịch nhiều bước đã có cơ chế thử lại riêng trong withTransaction.
const { laLoiThuLai } = require('../utils/loi-thu-lai');
const queryGoc = pool.query.bind(pool);
pool.query = async (...args) => {
  for (let lan = 1; ; lan++) {
    try { return await queryGoc(...args); } catch (e) {
      if (!laLoiThuLai(e) || lan >= 8) throw e;
      await new Promise(r => setTimeout(r, 20 * lan + Math.random() * 60));
    }
  }
};

module.exports = pool;
