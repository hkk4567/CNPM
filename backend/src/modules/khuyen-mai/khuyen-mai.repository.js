// khuyen-mai – truy vấn CSDL (KhuyenMai, KhuyenMaiSanPham; đọc ChiTietHoaDonKhuyenMai để đếm lượt dùng). Hàm nhận `conn` (mặc định pool).
const pool = require('../../config/db');

// trang_thai suy ra từ ngày, không lưu cột (KM-06). so_luot_dung = số LY đã áp mã (bỏ qua order đã hủy); chi tiết: schema.sql, ChiTietHoaDonKhuyenMai.
const COT = `km.ma_khuyen_mai, km.ten_khuyen_mai, km.loai_giam, km.gia_tri_giam, km.ngay_bat_dau, km.ngay_ket_thuc,
  CASE WHEN NOW() < km.ngay_bat_dau THEN 'sap_dien_ra' WHEN NOW() > km.ngay_ket_thuc THEN 'het_han' ELSE 'dang_chay' END AS trang_thai,
  (SELECT COUNT(*) FROM KhuyenMaiSanPham s WHERE s.ma_khuyen_mai = km.ma_khuyen_mai) AS so_san_pham,
  (SELECT COALESCE(SUM(c.so_luong), 0)
     FROM ChiTietHoaDonKhuyenMai x
     JOIN ChiTietHoaDon c ON c.ma_chi_tiet = x.ma_chi_tiet
     JOIN HoaDon h ON h.ma_hoa_don = c.ma_hoa_don
    WHERE x.ma_khuyen_mai = km.ma_khuyen_mai AND h.trang_thai <> 'huy') AS so_luot_dung`;

async function tao(d, conn = pool) {
  const [r] = await conn.query(
    'INSERT INTO KhuyenMai (ten_khuyen_mai, loai_giam, gia_tri_giam, ngay_bat_dau, ngay_ket_thuc) VALUES (?, ?, ?, ?, ?)',
    [d.ten_khuyen_mai, d.loai_giam, d.gia_tri_giam, d.ngay_bat_dau, d.ngay_ket_thuc]);
  return r.insertId;
}

// Khóa dòng khuyến mãi đến hết transaction (sửa/xóa/gán sản phẩm cùng lúc chạy nối tiếp). Trả bản ghi gốc (chưa suy ra trạng thái).
async function khoa(ma, conn) {
  const [rows] = await conn.query(
    'SELECT ma_khuyen_mai, ten_khuyen_mai, loai_giam, gia_tri_giam, ngay_bat_dau, ngay_ket_thuc FROM KhuyenMai WHERE ma_khuyen_mai = ? FOR UPDATE', [ma]);
  return rows[0] || null;
}

async function timTheoMa(ma, conn = pool) {
  const [rows] = await conn.query(`SELECT ${COT} FROM KhuyenMai km WHERE km.ma_khuyen_mai = ?`, [ma]);
  return rows[0] || null;
}

const COT_SUA = ['ten_khuyen_mai', 'loai_giam', 'gia_tri_giam', 'ngay_bat_dau', 'ngay_ket_thuc'];
async function sua(ma, truong, conn = pool) {
  const cot = COT_SUA.filter(c => truong[c] !== undefined);
  await conn.query(`UPDATE KhuyenMai SET ${cot.map(c => `${c} = ?`).join(', ')} WHERE ma_khuyen_mai = ?`, [...cot.map(c => truong[c]), ma]);
}

// Đã có dòng hóa đơn nào áp mã này chưa (kể cả order đang mở hoặc đã hủy: dữ liệu lịch sử vẫn tham chiếu)
async function daDuocDung(ma, conn = pool) {
  const [rows] = await conn.query('SELECT 1 AS co FROM ChiTietHoaDonKhuyenMai WHERE ma_khuyen_mai = ? LIMIT 1', [ma]);
  return rows.length > 0;
}

async function xoa(ma, conn = pool) {
  await conn.query('DELETE FROM KhuyenMai WHERE ma_khuyen_mai = ?', [ma]); // KhuyenMaiSanPham xóa theo (ON DELETE CASCADE)
}

async function danhSach({ trang_thai, ma_san_pham }, { limit, offset }, conn = pool) {
  const dk = [];
  const tham = [];
  if (trang_thai === 'sap_dien_ra') dk.push('NOW() < km.ngay_bat_dau');
  if (trang_thai === 'het_han') dk.push('NOW() > km.ngay_ket_thuc');
  if (trang_thai === 'dang_chay') dk.push('NOW() BETWEEN km.ngay_bat_dau AND km.ngay_ket_thuc');
  if (ma_san_pham) { dk.push('EXISTS (SELECT 1 FROM KhuyenMaiSanPham s WHERE s.ma_khuyen_mai = km.ma_khuyen_mai AND s.ma_san_pham = ?)'); tham.push(ma_san_pham); }
  const where = dk.length ? `WHERE ${dk.join(' AND ')}` : '';
  const [rows] = await conn.query(
    `SELECT ${COT} FROM KhuyenMai km ${where} ORDER BY km.ma_khuyen_mai DESC LIMIT ? OFFSET ?`, [...tham, limit, offset]);
  const [dem] = await conn.query(`SELECT COUNT(*) AS n FROM KhuyenMai km ${where}`, tham);
  return { rows, tong: dem[0].n };
}

async function layDanhSachSanPham(ma, conn = pool) {
  const [rows] = await conn.query(
    `SELECT sp.ma_san_pham, sp.ten_san_pham, sp.gia_ban, sp.trang_thai
     FROM KhuyenMaiSanPham s JOIN SanPham sp ON sp.ma_san_pham = s.ma_san_pham
     WHERE s.ma_khuyen_mai = ? ORDER BY sp.ma_san_pham`, [ma]);
  return rows;
}

// KM-04: bỏ qua cặp đã tồn tại
async function themSanPham(ma, dsMaSanPham, conn = pool) {
  if (!dsMaSanPham.length) return;
  await conn.query('INSERT IGNORE INTO KhuyenMaiSanPham (ma_khuyen_mai, ma_san_pham) VALUES ?', [dsMaSanPham.map(m => [ma, m])]);
}

async function goSanPham(ma, maSanPham, conn = pool) {
  const [r] = await conn.query('DELETE FROM KhuyenMaiSanPham WHERE ma_khuyen_mai = ? AND ma_san_pham = ?', [ma, maSanPham]);
  return r.affectedRows;
}

// 7b: các khuyến mãi ĐANG HIỆU LỰC của danh sách sản phẩm, sắp theo mã khuyến mãi tăng dần (thứ tự cộng dồn cố định).
// Làm HAI bước để chỉ khóa đúng bảng KhuyenMai:
//  1. đọc thường (không khóa) KhuyenMaiSanPham: sản phẩm nào thuộc mã nào;
//  2. đọc HIỆN HÀNH các mã đó trong KhuyenMai (còn hiệu lực không, loại và giá trị giảm hiện tại).
// khoa = true (đang ghi hóa đơn trong transaction): bước 2 khóa chia sẻ các dòng KhuyenMai, nên KM-02/KM-03 (luôn khóa dòng KhuyenMai
// TRƯỚC) chạy nối tiếp với việc gọi món: khuyến mãi không thể bị xóa/sửa chen giữa lúc tính giảm và lúc ghi ChiTietHoaDonKhuyenMai.
// KHÔNG khóa KhuyenMaiSanPham ở đây: KM-03 xóa dòng KhuyenMai (rồi cascade sang KhuyenMaiSanPham); nếu bên gọi món khóa KhuyenMaiSanPham
// trước rồi mới tới KhuyenMai thì hai bên khóa ngược thứ tự và DEADLOCK (đã gặp khi chạy test đồng thời).
async function layDangHieuLuc(dsMaSanPham, { conn = pool, khoa = false } = {}) {
  if (!dsMaSanPham.length) return [];
  const [lienKet] = await conn.query('SELECT ma_san_pham, ma_khuyen_mai FROM KhuyenMaiSanPham WHERE ma_san_pham IN (?)', [dsMaSanPham]);
  if (!lienKet.length) return [];
  const dsKm = [...new Set(lienKet.map(l => l.ma_khuyen_mai))];
  const [kms] = await conn.query(
    `SELECT ma_khuyen_mai, ten_khuyen_mai, loai_giam, gia_tri_giam FROM KhuyenMai
     WHERE ma_khuyen_mai IN (?) AND NOW() BETWEEN ngay_bat_dau AND ngay_ket_thuc
     ORDER BY ma_khuyen_mai ${khoa ? 'LOCK IN SHARE MODE' : ''}`, [dsKm]);
  const theoMa = new Map(kms.map(k => [k.ma_khuyen_mai, k]));
  return lienKet.filter(l => theoMa.has(l.ma_khuyen_mai))
    .map(l => ({ ma_san_pham: l.ma_san_pham, ...theoMa.get(l.ma_khuyen_mai) }))
    .sort((x, y) => x.ma_khuyen_mai - y.ma_khuyen_mai || x.ma_san_pham - y.ma_san_pham);
}

// KM-07: chỉ hóa đơn ĐÃ THANH TOÁN (đọc từ HoaDonDaThanhToan), lọc theo ngày thanh toán (gồm cả hai đầu).
//  so_hoa_don: số hóa đơn có dòng áp mã; so_luong_ban: số LY áp mã; tong_tien_giam: tiền giảm do RIÊNG mã này (muc_giam_moi_ly x số ly);
//  doanh_thu_sau_giam: doanh thu các dòng có áp mã, SAU TOÀN BỘ giảm (kể cả các mã khác cộng dồn trên cùng dòng).
async function baoCaoHieuQua(ma, { tu_ngay, den_ngay }, conn = pool) {
  const dk = ['x.ma_khuyen_mai = ?'];
  const tham = [ma];
  if (tu_ngay) { dk.push('p.thoi_gian_thanh_toan >= ?'); tham.push(tu_ngay); }
  if (den_ngay) { dk.push('p.thoi_gian_thanh_toan < ? + INTERVAL 1 DAY'); tham.push(den_ngay); }
  const [rows] = await conn.query(
    `SELECT COUNT(DISTINCT c.ma_hoa_don) AS so_hoa_don,
            COALESCE(SUM(c.so_luong), 0) AS so_luong_ban,
            COALESCE(SUM(x.muc_giam_moi_ly * c.so_luong), 0) AS tong_tien_giam,
            COALESCE(SUM(c.so_luong * c.don_gia - c.giam_gia), 0) AS doanh_thu_sau_giam
     FROM ChiTietHoaDonKhuyenMai x
     JOIN ChiTietHoaDon c ON c.ma_chi_tiet = x.ma_chi_tiet
     JOIN HoaDonDaThanhToan p ON p.ma_hoa_don = c.ma_hoa_don
     WHERE ${dk.join(' AND ')}`, tham);
  const r = rows[0];
  return { so_hoa_don: Number(r.so_hoa_don), so_luong_ban: Number(r.so_luong_ban), tong_tien_giam: Number(r.tong_tien_giam), doanh_thu_sau_giam: Number(r.doanh_thu_sau_giam) };
}

module.exports = { layDangHieuLuc, baoCaoHieuQua, tao, khoa, timTheoMa, sua, daDuocDung, xoa, danhSach, layDanhSachSanPham, themSanPham, goSanPham };
