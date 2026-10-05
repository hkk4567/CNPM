// scripts/db-init.js – chạy database/schema.sql rồi database/seed.sql trên MySQL/MariaDB (XAMPP)
// Chạy: cd backend && npm install && cp .env.example .env && npm run db:init
// Tùy chọn: node ../scripts/db-init.js --schema-only
const fs = require('fs');
const path = require('path');
const req = require('module').createRequire(path.join(__dirname, '..', 'backend', 'package.json'));
req('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
const mysql = req('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    charset: 'utf8mb4',
  });
  const dir = path.join(__dirname, '..', 'database');
  const files = process.argv.includes('--schema-only') ? ['schema.sql'] : ['schema.sql', 'seed.sql'];
  for (const f of files) {
    await conn.query(fs.readFileSync(path.join(dir, f), 'utf8'));
    console.log('Đã chạy', f);
  }
  await conn.end();
})().catch(e => { console.error('Lỗi:', e.message); process.exit(1); });
