// khach-hang – truy vấn CSDL. Hiện mới có phần cho hoa-don dùng; CRUD khách làm ở Sprint 2 (KH-01..KH-05).
const pool = require('../../config/db');

async function timTheoMa(ma, conn = pool) {
  const [rows] = await conn.query(
    'SELECT ma_khach_hang, ten_khach_hang, so_dien_thoai, diem_tich_luy FROM KhachHang WHERE ma_khach_hang = ?', [ma]);
  return rows[0] || null;
}

async function congDiem(ma, diem, conn = pool) {
  await conn.query('UPDATE KhachHang SET diem_tich_luy = diem_tich_luy + ? WHERE ma_khach_hang = ?', [diem, ma]);
}

module.exports = { timTheoMa, congDiem };
