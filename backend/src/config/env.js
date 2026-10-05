// Đọc và kiểm tra biến môi trường (backend/.env). Thiếu JWT_SECRET thì dừng ngay.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const GIA_TRI_MAU = 'doi-chuoi-nay-truoc-khi-chay';

function batBuoc(ten) {
  const v = process.env[ten];
  if (!v) throw new Error(`Thiếu biến môi trường ${ten} (xem backend/.env.example, tạo backend/.env)`);
  return v;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || 'cafe_management',
  },
  jwt: {
    secret: batBuoc('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
};

if (env.nodeEnv === 'production' && env.jwt.secret === GIA_TRI_MAU) {
  throw new Error('JWT_SECRET đang là giá trị mẫu, hãy đổi trước khi chạy production');
}

module.exports = env;
