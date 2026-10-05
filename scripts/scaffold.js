// scripts/scaffold.js – dựng khung thư mục dự án quản lý quán cà phê.
// Chạy: node scripts/scaffold.js   (an toàn chạy lại: KHÔNG ghi đè file đã có)
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// Module nghiệp vụ -> ID tính năng trong file đặc tả
const MODULES = {
  'auth': 'AUTH-01, AUTH-02',
  'san-pham': 'SP-01, POS-01 (menu)',
  'hoa-don': 'POS-02..POS-11 (order, thanh toán)',
  'khuyen-mai': 'KM-01..KM-07',
  'khach-hang': 'KH-01..KH-05',
  'kho': 'KHO-01..KHO-06',
  'nhan-su': 'NS-01..NS-07',
  'bao-cao': 'BC-01..BC-06',
};

const files = {}; // đường dẫn tương đối -> nội dung
const add = (p, c = '') => { files[p] = c; };
const cmt = (p, text) => add(p, (p.endsWith('.sql') ? '-- ' : '// ') + text + '\n');

// ---- Backend ----
for (const [m, ids] of Object.entries(MODULES)) {
  for (const k of ['routes', 'controller', 'service', 'repository', 'schema']) {
    cmt(`backend/src/modules/${m}/${m}.${k}.js`, `${m} – ${k} (${ids})`);
  }
  cmt(`backend/tests/${m}.test.js`, `Test module ${m} (${ids})`);
}
const backendShared = {
  'server.js': 'Khởi động HTTP server',
  'app.js': 'Tạo Express app, gắn middleware chung',
  'routes.js': 'Gắn routes của tất cả module dưới /api',
  'config/env.js': 'Đọc và kiểm tra biến môi trường (.env)',
  'config/db.js': 'Pool kết nối MySQL/MariaDB (XAMPP)',
  'middlewares/xac-thuc.js': 'Kiểm tra JWT, gắn req.nguoi_dung',
  'middlewares/phan-quyen.js': 'Kiểm tra quyen_truy_cap (admin/quan_ly/nhan_vien)',
  'middlewares/validate.js': 'Kiểm tra dữ liệu đầu vào theo schema của module',
  'middlewares/xu-ly-loi.js': 'Bắt lỗi, trả { ok:false, loi, thong_bao }',
  'utils/phan-trang.js': 'Tiện ích phân trang (trang, moi_trang)',
  'utils/phan-hoi.js': 'Định dạng { ok:true, data }',
  'utils/loi-nghiep-vu.js': 'Lớp lỗi có mã HTTP (400/401/403/404/409)',
  'utils/transaction.js': 'withTransaction(fn): dùng cho thanh toán, nhập kho, trừ kho',
};
for (const [p, t] of Object.entries(backendShared)) cmt(`backend/src/${p}`, t);
add('backend/.env.example', [
  'PORT=3000', 'CORS_ORIGIN=http://localhost:5173', 'DB_HOST=127.0.0.1', 'DB_PORT=3306', 'DB_USER=root', 'DB_PASSWORD=',
  'DB_NAME=cafe_management', 'JWT_SECRET=doi-chuoi-nay-truoc-khi-chay', 'JWT_EXPIRES_IN=8h', '',
].join('\n'));

// ---- Frontend ----
for (const [m, ids] of Object.entries(MODULES)) {
  cmt(`frontend/src/pages/${m}/index.jsx`, `Trang module ${m} (${ids})`);
  cmt(`frontend/src/api/${m}.api.js`, `Gọi API module ${m}`);
}
const frontendShared = {
  'main.jsx': 'Điểm vào React', 'App.jsx': 'Gốc ứng dụng',
  'routes/AppRoutes.jsx': 'Khai báo route theo module',
  'routes/RequireRole.jsx': 'Chặn route theo quyền A/Q/N',
  'context/AuthContext.jsx': 'Lưu token, thông tin người dùng, quyền',
  'layouts/MainLayout.jsx': 'Khung chính: sidebar theo quyền',
  'layouts/AuthLayout.jsx': 'Khung trang đăng nhập',
  'components/Pagination.jsx': 'Phân trang dùng chung',
  'components/DataTable.jsx': 'Bảng dữ liệu dùng chung',
  'components/ConfirmDialog.jsx': 'Hộp xác nhận (xóa, hủy order)',
  'hooks/useApi.js': 'Hook gọi API, loading/lỗi',
  'api/http.js': 'Cấu hình fetch/axios, gắn Authorization',
  'utils/format.js': 'Định dạng tiền, ngày giờ',
};
for (const [p, t] of Object.entries(frontendShared)) cmt(`frontend/src/${p}`, t);
add('frontend/src/styles/index.css', '/* Style chung */\n');
add('frontend/index.html', '<!doctype html>\n<html lang="vi">\n  <head><meta charset="UTF-8" /><title>Quản lý quán cà phê</title></head>\n  <body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>\n</html>\n');
cmt('frontend/vite.config.js', 'Cấu hình Vite (proxy /api sang backend)');
add('frontend/.env.example', 'VITE_API_URL=http://localhost:3000/api\n');

// ---- Database (XAMPP: MySQL/MariaDB) ----
cmt('database/schema.sql', 'Tạo CSDL cafe_management từ ERD (erd/cafe_erd.mmd), kèm index và UNIQUE');
cmt('database/seed.sql', 'Dữ liệu mẫu: tài khoản A/Q/N, danh mục, sản phẩm, ca làm việc');
add('database/README.md', '# Cơ sở dữ liệu\n\nXAMPP: bật MySQL, mở phpMyAdmin, import `schema.sql` rồi `seed.sql` (charset utf8mb4).\n');

// ---- Gốc dự án ----
add('.gitignore', 'node_modules/\n.env\ndist/\n*.log\n');
add('README.md', '# Hệ thống quản lý quán cà phê\n\nNode.js (backend Express + frontend React/Vite) và XAMPP (MySQL/MariaDB).\nTài liệu: thư mục `docs/`. Cấu trúc: xem `NOTES.md`.\n');

// ---- Ghi file (không ghi đè) ----
let tao = 0, bo_qua = 0;
for (const [rel, content] of Object.entries(files)) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  if (fs.existsSync(full)) { bo_qua++; continue; }
  fs.writeFileSync(full, content);
  tao++;
}
fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
console.log(`Đã tạo ${tao} file, bỏ qua ${bo_qua} file đã có.`);
