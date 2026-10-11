// khach-hang – truy vấn CSDL (KhachHang; lịch sử mua đọc từ HoaDonDaThanhToan). Hàm nhận `conn` (mặc định pool).
const pool = require('../../config/db');
const { dieuKienNgay } = require('../../utils/loc-ngay');

const COT = 'ma_khach_hang, ten_khach_hang, so_dien_thoai, diem_tich_luy';
const escapeLike = s => s.replace(/[\\%_]/g, '\\$&');

async function timTheoMa(ma, conn = pool) {
  const [rows] = await conn.query(`SELECT ${COT} FROM KhachHang WHERE ma_khach_hang = ?`, [ma]);
  return rows[0] || null;
}

async function timTheoSdt(sdt, conn = pool) {
  const [rows] = await conn.query(`SELECT ${COT} FROM KhachHang WHERE so_dien_thoai = ?`, [sdt]);
  return rows[0] || null;
}

// Khóa dòng khách (FOR UPDATE) đến hết transaction; dùng khi thanh toán để các thanh toán cùng khách chạy nối tiếp
async function khoa(ma, conn) {
  const [rows] = await conn.query('SELECT ma_khach_hang FROM KhachHang WHERE ma_khach_hang = ? FOR UPDATE', [ma]);
  return rows[0] || null;
}

async function tao({ ten_khach_hang, so_dien_thoai }, conn = pool) {
  const [r] = await conn.query('INSERT INTO KhachHang (ten_khach_hang, so_dien_thoai) VALUES (?, ?)', [ten_khach_hang, so_dien_thoai]);
  return r.insertId;
}

const COT_SUA = ['ten_khach_hang', 'so_dien_thoai']; // không có diem_tich_luy
async function sua(ma, truong, conn = pool) {
  const cot = COT_SUA.filter(c => truong[c] !== undefined);
  await conn.query(`UPDATE KhachHang SET ${cot.map(c => `${c} = ?`).join(', ')} WHERE ma_khach_hang = ?`, [...cot.map(c => truong[c]), ma]);
}

// KH-03: tên hoặc SĐT chứa từ khóa (không phân biệt dấu/hoa thường nhờ collation), tối đa `gioiHan` kết quả
async function tim(tuKhoa, gioiHan, conn = pool) {
  const mau = `%${escapeLike(tuKhoa)}%`;
  const [rows] = await conn.query(
    `SELECT ${COT} FROM KhachHang WHERE ten_khach_hang LIKE ? OR so_dien_thoai LIKE ?
     ORDER BY ten_khach_hang, ma_khach_hang LIMIT ?`, [mau, mau, gioiHan]);
  return rows;
}

async function congDiem(ma, diem, conn = pool) {
  await conn.query('UPDATE KhachHang SET diem_tich_luy = diem_tich_luy + ? WHERE ma_khach_hang = ?', [diem, ma]);
}

// KH-04: hóa đơn đã thanh toán của khách; lọc theo NGÀY THANH TOÁN (tu_ngay/den_ngay gồm cả hai đầu)
async function lichSuMua(ma, { tu_ngay, den_ngay }, { limit, offset }, conn = pool) {
  const dk = ['ma_khach_hang = ?'];
  const tham = [ma];
  if (tu_ngay) { dk.push('thoi_gian_thanh_toan >= ?'); tham.push(tu_ngay); }
  if (den_ngay) { dk.push('thoi_gian_thanh_toan < ? + INTERVAL 1 DAY'); tham.push(den_ngay); }
  const where = `WHERE ${dk.join(' AND ')}`;
  const [rows] = await conn.query(
    `SELECT ma_hoa_don, so_thu_tu, thoi_gian_tao, thoi_gian_thanh_toan, phuong_thuc_thanh_toan,
            tong_tien_hang, tong_giam_gia, tong_tien, diem_cong
     FROM HoaDonDaThanhToan ${where} ORDER BY thoi_gian_thanh_toan DESC, ma_hoa_don DESC LIMIT ? OFFSET ?`, [...tham, limit, offset]);
  const [tong] = await conn.query(
    `SELECT COUNT(*) AS so_don, COALESCE(SUM(tong_tien), 0) AS tong_chi_tieu FROM HoaDonDaThanhToan ${where}`, tham);
  return { rows, so_don: Number(tong[0].so_don), tong_chi_tieu: Number(tong[0].tong_chi_tieu) };
}

// KH-05: xếp hạng theo tổng chi tiêu (SUM tong_tien) của hóa đơn đã thanh toán; chỉ khách có tài khoản khách hàng (bỏ khách vãng lai).
async function topKhach(loc, top, conn = pool) {
  const { dk, tham } = dieuKienNgay('p.thoi_gian_thanh_toan', loc);
  const [rows] = await conn.query(
    `SELECT k.ma_khach_hang, k.ten_khach_hang AS ten, k.so_dien_thoai, COUNT(*) AS so_don, SUM(p.tong_tien) AS tong_chi_tieu
     FROM HoaDonDaThanhToan p JOIN KhachHang k ON k.ma_khach_hang = p.ma_khach_hang
     ${dk.length ? `WHERE ${dk.join(' AND ')}` : ''}
     GROUP BY k.ma_khach_hang, k.ten_khach_hang, k.so_dien_thoai
     ORDER BY tong_chi_tieu DESC, so_don DESC, k.ma_khach_hang ASC LIMIT ?`, [...tham, top]);
  return rows.map(r => ({ ...r, so_don: Number(r.so_don), tong_chi_tieu: Number(r.tong_chi_tieu) }));
}

module.exports = { topKhach, khoa, timTheoMa, timTheoSdt, tao, sua, tim, congDiem, lichSuMua };
