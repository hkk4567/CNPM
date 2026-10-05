// kho – truy vấn CSDL. Hiện mới có phần kiểm tra đủ nguyên liệu; CRUD kho/nhập hàng làm ở Sprint 3.
const pool = require('../../config/db');

async function layCongThucVaTon(dsMaSanPham, conn = pool) {
  if (!dsMaSanPham.length) return [];
  const [rows] = await conn.query(
    `SELECT ct.ma_san_pham, ct.ma_nguyen_lieu, ct.dinh_luong, nl.ten_nguyen_lieu, nl.don_vi_tinh, nl.so_luong_ton
     FROM CongThuc ct JOIN NguyenLieu nl ON nl.ma_nguyen_lieu = ct.ma_nguyen_lieu
     WHERE ct.ma_san_pham IN (?)`, [dsMaSanPham]);
  return rows;
}

// Khóa các nguyên liệu (FOR UPDATE) theo thứ tự mã tăng dần để mọi giao dịch khóa cùng thứ tự -> không bị deadlock.
async function khoaNguyenLieu(dsMa, conn) {
  const [rows] = await conn.query(
    `SELECT ma_nguyen_lieu, ten_nguyen_lieu, don_vi_tinh, so_luong_ton, muc_ton_toi_thieu
     FROM NguyenLieu WHERE ma_nguyen_lieu IN (?) ORDER BY ma_nguyen_lieu FOR UPDATE`, [dsMa]);
  return rows;
}

async function truTon(maNguyenLieu, soLuong, conn) {
  await conn.query('UPDATE NguyenLieu SET so_luong_ton = so_luong_ton - ? WHERE ma_nguyen_lieu = ?', [soLuong, maNguyenLieu]);
}

module.exports = { layCongThucVaTon, khoaNguyenLieu, truTon };
