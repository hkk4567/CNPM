// bao-cao – truy vấn CHỈ ĐỌC. Doanh thu lấy từ HoaDonDaThanhToan (bảng snapshot bất biến, lọc theo NGÀY THANH TOÁN);
// chi tiết món lấy từ ChiTietHoaDon của chính các hóa đơn đó; chi phí nhập lấy từ PhieuNhap theo ngay_nhap.
const pool = require('../../config/db');
const { dieuKienNgay } = require('../../utils/loc-ngay');

const where = dk => (dk.length ? `WHERE ${dk.join(' AND ')}` : '');
// Biểu thức nhãn kỳ: ngày 'YYYY-MM-DD'; tuần = ngày THỨ HAI đầu tuần 'YYYY-MM-DD'; tháng 'YYYY-MM'.
const NHAN_KY = {
  ngay: cot => `DATE_FORMAT(${cot}, '%Y-%m-%d')`,
  tuan: cot => `DATE_FORMAT(DATE(${cot}) - INTERVAL WEEKDAY(${cot}) DAY, '%Y-%m-%d')`,
  thang: cot => `DATE_FORMAT(${cot}, '%Y-%m')`,
};

// BC-01
async function doanhThuTheoKy(loc, nhom, conn = pool) {
  const { dk, tham } = dieuKienNgay('thoi_gian_thanh_toan', loc);
  const ky = NHAN_KY[nhom]('thoi_gian_thanh_toan');
  const [rows] = await conn.query(
    `SELECT ${ky} AS ky, COUNT(*) AS so_don, SUM(tong_tien) AS doanh_thu FROM HoaDonDaThanhToan ${where(dk)} GROUP BY ky ORDER BY ky`, tham);
  return rows.map(r => ({ ky: r.ky, so_don: Number(r.so_don), doanh_thu: Number(r.doanh_thu) }));
}
// BC-02: doanh_thu của dòng = so_luong * don_gia - giam_gia (giam_gia đã là tổng giảm của dòng)
async function sanPhamBanChay(loc, top, conn = pool) {
  const { dk, tham } = dieuKienNgay('p.thoi_gian_thanh_toan', loc);
  const [rows] = await conn.query(
    `SELECT s.ma_san_pham, s.ten_san_pham, SUM(c.so_luong) AS so_luong, SUM(c.so_luong * c.don_gia - c.giam_gia) AS doanh_thu
     FROM ChiTietHoaDon c JOIN HoaDonDaThanhToan p ON p.ma_hoa_don = c.ma_hoa_don JOIN SanPham s ON s.ma_san_pham = c.ma_san_pham
     ${where(dk)} GROUP BY s.ma_san_pham, s.ten_san_pham ORDER BY so_luong DESC, doanh_thu DESC, s.ma_san_pham ASC LIMIT ?`, [...tham, top]);
  return rows.map(r => ({ ...r, so_luong: Number(r.so_luong), doanh_thu: Number(r.doanh_thu) }));
}
// BC-03
async function doanhThuTheoDanhMuc(loc, conn = pool) {
  const { dk, tham } = dieuKienNgay('p.thoi_gian_thanh_toan', loc);
  const [rows] = await conn.query(
    `SELECT d.ma_danh_muc, d.ten_danh_muc, SUM(c.so_luong * c.don_gia - c.giam_gia) AS doanh_thu
     FROM ChiTietHoaDon c JOIN HoaDonDaThanhToan p ON p.ma_hoa_don = c.ma_hoa_don
     JOIN SanPham s ON s.ma_san_pham = c.ma_san_pham JOIN DanhMuc d ON d.ma_danh_muc = s.ma_danh_muc
     ${where(dk)} GROUP BY d.ma_danh_muc, d.ten_danh_muc ORDER BY doanh_thu DESC, d.ma_danh_muc ASC`, tham);
  return rows.map(r => ({ ...r, doanh_thu: Number(r.doanh_thu) }));
}
// BC-04
async function theoPhuongThuc(loc, conn = pool) {
  const { dk, tham } = dieuKienNgay('thoi_gian_thanh_toan', loc);
  const [rows] = await conn.query(
    `SELECT phuong_thuc_thanh_toan AS phuong_thuc, COUNT(*) AS so_don, SUM(tong_tien) AS tong_tien FROM HoaDonDaThanhToan ${where(dk)}
     GROUP BY phuong_thuc_thanh_toan ORDER BY tong_tien DESC, phuong_thuc ASC`, tham);
  return rows.map(r => ({ phuong_thuc: r.phuong_thuc, so_don: Number(r.so_don), tong_tien: Number(r.tong_tien) }));
}
// BC-05: hai phép gom riêng (doanh thu / chi phí nhập) theo cùng nhãn kỳ; việc gộp theo kỳ làm ở service
async function chiPhiNhapTheoKy(loc, nhom, conn = pool) {
  const { dk, tham } = dieuKienNgay('ngay_nhap', loc);
  const ky = NHAN_KY[nhom]('ngay_nhap');
  const [rows] = await conn.query(`SELECT ${ky} AS ky, SUM(tong_tien_nhap) AS chi_phi_nhap FROM PhieuNhap ${where(dk)} GROUP BY ky ORDER BY ky`, tham);
  return rows.map(r => ({ ky: r.ky, chi_phi_nhap: Number(r.chi_phi_nhap) }));
}
// BC-06: nhân viên nhập order của hóa đơn (HoaDonDaThanhToan.ma_nhan_vien)
async function theoNhanVien(loc, conn = pool) {
  const { dk, tham } = dieuKienNgay('p.thoi_gian_thanh_toan', loc);
  const [rows] = await conn.query(
    `SELECT n.ma_nhan_vien, n.ho_ten, COUNT(*) AS so_don, SUM(p.tong_tien) AS doanh_thu
     FROM HoaDonDaThanhToan p JOIN NhanVien n ON n.ma_nhan_vien = p.ma_nhan_vien
     ${where(dk)} GROUP BY n.ma_nhan_vien, n.ho_ten ORDER BY doanh_thu DESC, n.ma_nhan_vien ASC`, tham);
  return rows.map(r => ({ ...r, so_don: Number(r.so_don), doanh_thu: Number(r.doanh_thu) }));
}

module.exports = { doanhThuTheoKy, sanPhamBanChay, doanhThuTheoDanhMuc, theoPhuongThuc, chiPhiNhapTheoKy, theoNhanVien };
