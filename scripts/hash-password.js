// scripts/hash-password.js – tạo băm bcrypt để dán vào database/seed.sql
// Chạy: cd backend && npm install && node ../scripts/hash-password.js "MatKhau@123"
const path = require('path');
const req = require('module').createRequire(path.join(__dirname, '..', 'backend', 'package.json'));
const bcrypt = req('bcryptjs');
const mk = process.argv[2];
if (!mk) { console.error('Dùng: node scripts/hash-password.js "<mat_khau>"'); process.exit(1); }
console.log(bcrypt.hashSync(mk, 10));
