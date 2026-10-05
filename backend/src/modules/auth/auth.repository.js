// auth – truy vấn CSDL (TaiKhoan + NhanVien).
const pool = require('../../config/db');

const COT = `tk.ma_tai_khoan, tk.ma_nhan_vien, tk.ten_dang_nhap, tk.quyen_truy_cap,
             nv.ho_ten, nv.trang_thai`;

async function timTheoTenDangNhap(tenDangNhap) {
  const [rows] = await pool.query(
    `SELECT ${COT}, tk.mat_khau_hash
     FROM TaiKhoan tk JOIN NhanVien nv ON nv.ma_nhan_vien = tk.ma_nhan_vien
     WHERE tk.ten_dang_nhap = ?`, [tenDangNhap]);
  return rows[0] || null;
}

async function timTheoMaTaiKhoan(maTaiKhoan) {
  const [rows] = await pool.query(
    `SELECT ${COT}
     FROM TaiKhoan tk JOIN NhanVien nv ON nv.ma_nhan_vien = tk.ma_nhan_vien
     WHERE tk.ma_tai_khoan = ?`, [maTaiKhoan]);
  return rows[0] || null;
}

module.exports = { timTheoTenDangNhap, timTheoMaTaiKhoan };
