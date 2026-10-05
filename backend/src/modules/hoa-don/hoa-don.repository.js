// hoa-don – truy vấn CSDL (HoaDon, ChiTietHoaDon). Hàm nhận `conn` (mặc định pool) để dùng trong transaction.
const pool = require('../../config/db');

async function homNay(conn = pool) {
  const [rows] = await conn.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS d");
  return rows[0].d;
}

// Số thứ tự kế tiếp trong NGÀY (reset mỗi ngày). Phải gọi trong transaction đang giữ khóa 'so_thu_tu_hoa_don'.
async function soThuTuTiepTheo(conn) {
  const [rows] = await conn.query(
    `SELECT COALESCE(MAX(so_thu_tu), 0) + 1 AS n FROM HoaDon
     WHERE thoi_gian_tao >= CURDATE() AND thoi_gian_tao < CURDATE() + INTERVAL 1 DAY`);
  return Number(rows[0].n);
}

async function taoHoaDon({ ma_khach_hang, ma_nhan_vien, so_thu_tu }, conn = pool) {
  const [r] = await conn.query(
    'INSERT INTO HoaDon (ma_khach_hang, ma_nhan_vien, so_thu_tu) VALUES (?, ?, ?)',
    [ma_khach_hang ?? null, ma_nhan_vien, so_thu_tu]);
  return r.insertId;
}

async function themChiTiet(maHoaDon, dongs, conn = pool) {
  const values = dongs.map(d => [maHoaDon, d.ma_san_pham, d.ma_khuyen_mai ?? null, d.so_luong, d.don_gia, d.giam_gia ?? 0, d.ghi_chu || null]);
  await conn.query(
    'INSERT INTO ChiTietHoaDon (ma_hoa_don, ma_san_pham, ma_khuyen_mai, so_luong, don_gia, giam_gia, ghi_chu) VALUES ?', [values]);
}

async function layHoaDon(ma, conn = pool) {
  const [hd] = await conn.query(
    `SELECT hd.ma_hoa_don, hd.so_thu_tu, hd.thoi_gian_tao, hd.trang_thai, hd.phuong_thuc_thanh_toan, hd.tong_tien,
            hd.ma_khach_hang, kh.ten_khach_hang, hd.ma_nhan_vien, nv.ho_ten AS ten_nhan_vien
     FROM HoaDon hd
     JOIN NhanVien nv ON nv.ma_nhan_vien = hd.ma_nhan_vien
     LEFT JOIN KhachHang kh ON kh.ma_khach_hang = hd.ma_khach_hang
     WHERE hd.ma_hoa_don = ?`, [ma]);
  if (!hd[0]) return null;
  const [chiTiet] = await conn.query(
    `SELECT c.ma_chi_tiet, c.ma_san_pham, sp.ten_san_pham, c.so_luong, c.don_gia, c.giam_gia, c.ma_khuyen_mai, c.ghi_chu,
            c.so_luong * c.don_gia - c.giam_gia AS thanh_tien
     FROM ChiTietHoaDon c JOIN SanPham sp ON sp.ma_san_pham = c.ma_san_pham
     WHERE c.ma_hoa_don = ? ORDER BY c.ma_chi_tiet`, [ma]);
  return { ...hd[0], chi_tiet: chiTiet };
}

// POS-10. tong_tien: hóa đơn đã thanh toán lấy số đã chốt; còn lại là tạm tính từ các dòng.
async function danhSach({ ngay, trang_thai, ma_nhan_vien }, { limit, offset }, conn = pool) {
  const dk = [];
  const tham = [];
  if (ngay) {
    dk.push('hd.thoi_gian_tao >= ? AND hd.thoi_gian_tao < ? + INTERVAL 1 DAY');
    tham.push(ngay, ngay);
  } else {
    dk.push('hd.thoi_gian_tao >= CURDATE() AND hd.thoi_gian_tao < CURDATE() + INTERVAL 1 DAY');
  }
  if (trang_thai) { dk.push('hd.trang_thai = ?'); tham.push(trang_thai); }
  if (ma_nhan_vien) { dk.push('hd.ma_nhan_vien = ?'); tham.push(ma_nhan_vien); }
  const where = `WHERE ${dk.join(' AND ')}`;

  const [rows] = await conn.query(
    `SELECT hd.ma_hoa_don, hd.so_thu_tu, hd.thoi_gian_tao, hd.trang_thai, hd.phuong_thuc_thanh_toan,
            hd.ma_khach_hang, kh.ten_khach_hang, hd.ma_nhan_vien, nv.ho_ten AS ten_nhan_vien,
            COALESCE(t.so_mon, 0) AS so_mon,
            IF(hd.trang_thai = 'da_thanh_toan', hd.tong_tien, COALESCE(t.tam_tinh, 0)) AS tong_tien
     FROM HoaDon hd
     JOIN NhanVien nv ON nv.ma_nhan_vien = hd.ma_nhan_vien
     LEFT JOIN KhachHang kh ON kh.ma_khach_hang = hd.ma_khach_hang
     LEFT JOIN (
       SELECT ma_hoa_don, SUM(so_luong) AS so_mon, SUM(so_luong * don_gia - giam_gia) AS tam_tinh
       FROM ChiTietHoaDon GROUP BY ma_hoa_don
     ) t ON t.ma_hoa_don = hd.ma_hoa_don
     ${where}
     ORDER BY hd.so_thu_tu, hd.ma_hoa_don LIMIT ? OFFSET ?`, [...tham, limit, offset]);
  const [dem] = await conn.query(`SELECT COUNT(*) AS n FROM HoaDon hd ${where}`, tham);
  return { rows, tong: dem[0].n };
}

// ---------- Chỉnh sửa order (POS-03/04/05/07/09) ----------
// Khóa dòng hóa đơn đến hết transaction: các thao tác sửa/thanh toán trên CÙNG hóa đơn chạy nối tiếp nhau.
async function khoaHoaDon(ma, conn) {
  const [rows] = await conn.query('SELECT ma_hoa_don, trang_thai FROM HoaDon WHERE ma_hoa_don = ? FOR UPDATE', [ma]);
  return rows[0] || null;
}

async function layDongCuaHoaDon(ma, conn = pool) {
  const [rows] = await conn.query(
    'SELECT ma_chi_tiet, ma_san_pham, so_luong, don_gia, giam_gia FROM ChiTietHoaDon WHERE ma_hoa_don = ? ORDER BY ma_chi_tiet', [ma]);
  return rows;
}

async function timDong(maChiTiet, maHoaDon, conn = pool) {
  const [rows] = await conn.query(
    'SELECT ma_chi_tiet, ma_san_pham, so_luong, don_gia, giam_gia FROM ChiTietHoaDon WHERE ma_chi_tiet = ? AND ma_hoa_don = ?', [maChiTiet, maHoaDon]);
  return rows[0] || null;
}

const COT_SUA_DONG = ['so_luong', 'giam_gia', 'ghi_chu'];
async function suaDong(maChiTiet, truong, conn = pool) {
  const cot = COT_SUA_DONG.filter(c => truong[c] !== undefined);
  await conn.query(`UPDATE ChiTietHoaDon SET ${cot.map(c => `${c} = ?`).join(', ')} WHERE ma_chi_tiet = ?`, [...cot.map(c => truong[c]), maChiTiet]);
}

async function xoaDong(maChiTiet, conn = pool) {
  await conn.query('DELETE FROM ChiTietHoaDon WHERE ma_chi_tiet = ?', [maChiTiet]);
}

async function doiTrangThai(ma, trangThai, conn = pool) {
  await conn.query('UPDATE HoaDon SET trang_thai = ? WHERE ma_hoa_don = ?', [trangThai, ma]);
}

// POS-08: chốt thanh toán. Điều kiện trang_thai <> 'da_thanh_toan' giữ cho thao tác không bao giờ chạy hai lần.
async function chotThanhToan(ma, phuongThuc, tongTien, conn) {
  const [r] = await conn.query(
    `UPDATE HoaDon SET trang_thai = 'da_thanh_toan', phuong_thuc_thanh_toan = ?, tong_tien = ?
     WHERE ma_hoa_don = ? AND trang_thai <> 'da_thanh_toan'`, [phuongThuc, tongTien, ma]);
  return r.affectedRows;
}

// POS-11: hóa đơn tạo trong ngày hôm nay (theo giờ CSDL)?
async function laHoaDonHomNay(ma, conn = pool) {
  const [rows] = await conn.query(
    `SELECT 1 AS co FROM HoaDon WHERE ma_hoa_don = ? AND thoi_gian_tao >= CURDATE() AND thoi_gian_tao < CURDATE() + INTERVAL 1 DAY`, [ma]);
  return rows.length > 0;
}

module.exports = {
  chotThanhToan, laHoaDonHomNay,
  homNay, soThuTuTiepTheo, taoHoaDon, themChiTiet, layHoaDon, danhSach,
  khoaHoaDon, layDongCuaHoaDon, timDong, suaDong, xoaDong, doiTrangThai,
};
