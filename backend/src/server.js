// Khởi động HTTP server. Chạy: npm start (hoặc npm run dev để tự khởi động lại khi sửa code).
const env = require('./config/env');
const pool = require('./config/db');
const { taoApp } = require('./app');

const server = taoApp().listen(env.port, () => {
  console.log(`Backend chạy tại http://localhost:${env.port}  (kiểm tra: /api/health)`);
});

pool.query('SELECT 1').catch(e => {
  console.error(`Không kết nối được CSDL "${env.db.database}": ${e.message}\n-> Đã bật MySQL trong XAMPP và chạy "npm run db:init" chưa?`);
});

async function tat() {
  server.close();
  await pool.end();
  process.exit(0);
}
process.on('SIGINT', tat);
process.on('SIGTERM', tat);
