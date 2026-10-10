// kho – truy vấn CSDL: kiểm tra/trừ/trả nguyên liệu (bán hàng), 8a: CRUD nguyên liệu (KHO-01), nhà cung cấp (KHO-02), tồn kho (KHO-06).
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

async function congTon(maNguyenLieu, soLuong, conn) {
  await conn.query('UPDATE NguyenLieu SET so_luong_ton = so_luong_ton + ? WHERE ma_nguyen_lieu = ?', [soLuong, maNguyenLieu]);
}

// ---------- KHO-01 nguyên liệu ----------
const COT_NL = 'ma_nguyen_lieu, ten_nguyen_lieu, don_vi_tinh, so_luong_ton, muc_ton_toi_thieu';
const escapeLike = x => x.replace(/[\\%_]/g, '\\$&');
const mauLike = tuKhoa => `%${escapeLike(tuKhoa)}%`;

async function timNguyenLieu(ma, conn = pool) {
  const [rows] = await conn.query(`SELECT ${COT_NL} FROM NguyenLieu WHERE ma_nguyen_lieu = ?`, [ma]);
  return rows[0] || null;
}

// Khóa MỘT nguyên liệu (FOR UPDATE) và trả dòng mới nhất. Mọi thay đổi/xóa nguyên liệu (và đặt công thức, nhập hàng ở 8b) khóa dòng này trước.
async function khoaMotNguyenLieu(ma, conn) {
  const [rows] = await conn.query(`SELECT ${COT_NL} FROM NguyenLieu WHERE ma_nguyen_lieu = ? FOR UPDATE`, [ma]);
  return rows[0] || null;
}

async function taoNguyenLieu({ ten_nguyen_lieu, don_vi_tinh, muc_ton_toi_thieu = 0 }, conn = pool) {
  const [r] = await conn.query(
    'INSERT INTO NguyenLieu (ten_nguyen_lieu, don_vi_tinh, muc_ton_toi_thieu) VALUES (?, ?, ?)', [ten_nguyen_lieu, don_vi_tinh, muc_ton_toi_thieu]);
  return r.insertId;
}

const COT_SUA_NL = ['ten_nguyen_lieu', 'don_vi_tinh', 'muc_ton_toi_thieu']; // KHÔNG có so_luong_ton
async function suaNguyenLieu(ma, truong, conn = pool) {
  const cot = COT_SUA_NL.filter(c => truong[c] !== undefined);
  await conn.query(`UPDATE NguyenLieu SET ${cot.map(c => `${c} = ?`).join(', ')} WHERE ma_nguyen_lieu = ?`, [...cot.map(c => truong[c]), ma]);
}

async function xoaNguyenLieu(ma, conn = pool) {
  await conn.query('DELETE FROM NguyenLieu WHERE ma_nguyen_lieu = ?', [ma]);
}

// Nguyên liệu đã nằm trong công thức hoặc phiếu nhập? (đọc thường, gọi SAU khi đã khóa dòng nguyên liệu)
async function nguyenLieuDangDung(ma, conn = pool) {
  const [rows] = await conn.query(
    `SELECT EXISTS(SELECT 1 FROM CongThuc WHERE ma_nguyen_lieu = ?) AS cong_thuc,
            EXISTS(SELECT 1 FROM ChiTietNhap WHERE ma_nguyen_lieu = ?) AS phieu_nhap`, [ma, ma]);
  return { cong_thuc: !!rows[0].cong_thuc, phieu_nhap: !!rows[0].phieu_nhap };
}

async function danhSachNguyenLieu(tuKhoa, { limit, offset }, conn = pool) {
  const dk = tuKhoa ? 'WHERE ten_nguyen_lieu LIKE ?' : '';
  const tham = tuKhoa ? [mauLike(tuKhoa)] : [];
  const [[{ tong }]] = await conn.query(`SELECT COUNT(*) AS tong FROM NguyenLieu ${dk}`, tham);
  const [rows] = await conn.query(
    `SELECT ${COT_NL} FROM NguyenLieu ${dk} ORDER BY ma_nguyen_lieu LIMIT ? OFFSET ?`, [...tham, limit, offset]);
  return { rows, tong };
}

// KHO-06: toàn bộ nguyên liệu kèm cờ sap_het (tồn <= mức tối thiểu, cùng quy tắc canh_bao_kho khi bán hàng); sắp hết lên đầu
async function tonKho({ chiSapHet, tuKhoa }, conn = pool) {
  const dk = []; const tham = [];
  if (chiSapHet) dk.push('so_luong_ton <= muc_ton_toi_thieu');
  if (tuKhoa) { dk.push('ten_nguyen_lieu LIKE ?'); tham.push(mauLike(tuKhoa)); }
  const [rows] = await conn.query(
    `SELECT ${COT_NL}, (so_luong_ton <= muc_ton_toi_thieu) AS sap_het FROM NguyenLieu
     ${dk.length ? `WHERE ${dk.join(' AND ')}` : ''} ORDER BY sap_het DESC, ten_nguyen_lieu, ma_nguyen_lieu`, tham);
  return rows.map(r => ({ ...r, sap_het: !!r.sap_het }));
}

// ---------- KHO-02 nhà cung cấp ----------
const COT_NCC = 'ma_ncc, ten_ncc, so_dien_thoai, dia_chi';

async function timNcc(ma, conn = pool) {
  const [rows] = await conn.query(`SELECT ${COT_NCC} FROM NhaCungCap WHERE ma_ncc = ?`, [ma]);
  return rows[0] || null;
}

async function khoaNcc(ma, conn) {
  const [rows] = await conn.query(`SELECT ${COT_NCC} FROM NhaCungCap WHERE ma_ncc = ? FOR UPDATE`, [ma]);
  return rows[0] || null;
}

async function taoNcc({ ten_ncc, so_dien_thoai = null, dia_chi = null }, conn = pool) {
  const [r] = await conn.query('INSERT INTO NhaCungCap (ten_ncc, so_dien_thoai, dia_chi) VALUES (?, ?, ?)', [ten_ncc, so_dien_thoai, dia_chi]);
  return r.insertId;
}

const COT_SUA_NCC = ['ten_ncc', 'so_dien_thoai', 'dia_chi'];
async function suaNcc(ma, truong, conn = pool) {
  const cot = COT_SUA_NCC.filter(c => truong[c] !== undefined);
  await conn.query(`UPDATE NhaCungCap SET ${cot.map(c => `${c} = ?`).join(', ')} WHERE ma_ncc = ?`, [...cot.map(c => truong[c]), ma]);
}

async function nccDaCoPhieuNhap(ma, conn = pool) {
  const [rows] = await conn.query('SELECT 1 AS co FROM PhieuNhap WHERE ma_ncc = ? LIMIT 1', [ma]);
  return rows.length > 0;
}

async function xoaNcc(ma, conn = pool) {
  await conn.query('DELETE FROM NhaCungCap WHERE ma_ncc = ?', [ma]);
}

async function danhSachNcc(tuKhoa, { limit, offset }, conn = pool) {
  const dk = tuKhoa ? 'WHERE ten_ncc LIKE ? OR so_dien_thoai LIKE ?' : '';
  const tham = tuKhoa ? [mauLike(tuKhoa), mauLike(tuKhoa)] : [];
  const [[{ tong }]] = await conn.query(`SELECT COUNT(*) AS tong FROM NhaCungCap ${dk}`, tham);
  const [rows] = await conn.query(`SELECT ${COT_NCC} FROM NhaCungCap ${dk} ORDER BY ma_ncc LIMIT ? OFFSET ?`, [...tham, limit, offset]);
  return { rows, tong };
}

// ---------- KHO-03 công thức ----------
async function layCongThuc(maSanPham, conn = pool) {
  const [rows] = await conn.query(
    `SELECT ct.ma_nguyen_lieu, nl.ten_nguyen_lieu, nl.don_vi_tinh, ct.dinh_luong
     FROM CongThuc ct JOIN NguyenLieu nl ON nl.ma_nguyen_lieu = ct.ma_nguyen_lieu
     WHERE ct.ma_san_pham = ? ORDER BY ct.ma_nguyen_lieu`, [maSanPham]);
  return rows;
}
async function xoaCongThuc(maSanPham, conn) {
  await conn.query('DELETE FROM CongThuc WHERE ma_san_pham = ?', [maSanPham]);
}
async function themCongThuc(maSanPham, dong, conn) {
  if (!dong.length) return;
  await conn.query('INSERT INTO CongThuc (ma_san_pham, ma_nguyen_lieu, dinh_luong) VALUES ?', [dong.map(d => [maSanPham, d.ma_nguyen_lieu, d.dinh_luong])]);
}

// ---------- KHO-04/05 phiếu nhập ----------
// Khóa dòng NCC ở chế độ CHIA SẺ: nhiều phiếu của cùng NCC lập song song được, nhưng KHO-02 xóa NCC (FOR UPDATE) phải chờ/ bị chặn.
async function khoaNccDeLapPhieu(ma, conn) {
  const [rows] = await conn.query('SELECT ma_ncc, ten_ncc FROM NhaCungCap WHERE ma_ncc = ? LOCK IN SHARE MODE', [ma]);
  return rows[0] || null;
}
async function taoPhieuNhap({ ma_ncc, ma_nhan_vien, ngay_nhap, tong_tien_nhap }, conn) {
  const [r] = await conn.query(
    'INSERT INTO PhieuNhap (ma_ncc, ma_nhan_vien, ngay_nhap, tong_tien_nhap) VALUES (?, ?, COALESCE(?, NOW()), ?)', [ma_ncc, ma_nhan_vien, ngay_nhap || null, tong_tien_nhap]);
  return r.insertId;
}
async function themChiTietNhap(maPhieu, dong, conn) {
  await conn.query('INSERT INTO ChiTietNhap (ma_phieu_nhap, ma_nguyen_lieu, so_luong_nhap, don_gia_nhap) VALUES ?',
    [dong.map(d => [maPhieu, d.ma_nguyen_lieu, d.so_luong_nhap, d.don_gia_nhap])]);
}
const COT_PHIEU = `p.ma_phieu_nhap, p.ma_ncc, n.ten_ncc, p.ma_nhan_vien, nv.ho_ten AS ten_nhan_vien, p.ngay_nhap, p.tong_tien_nhap`;
const TU_PHIEU = `FROM PhieuNhap p JOIN NhaCungCap n ON n.ma_ncc = p.ma_ncc JOIN NhanVien nv ON nv.ma_nhan_vien = p.ma_nhan_vien`;

async function timPhieuNhap(ma, conn = pool) {
  const [rows] = await conn.query(`SELECT ${COT_PHIEU} ${TU_PHIEU} WHERE p.ma_phieu_nhap = ?`, [ma]);
  return rows[0] || null;
}
async function layChiTietNhap(maPhieu, conn = pool) {
  const [rows] = await conn.query(
    `SELECT c.ma_nguyen_lieu, nl.ten_nguyen_lieu, nl.don_vi_tinh, c.so_luong_nhap, c.don_gia_nhap,
            ROUND(c.so_luong_nhap * c.don_gia_nhap, 2) AS thanh_tien
     FROM ChiTietNhap c JOIN NguyenLieu nl ON nl.ma_nguyen_lieu = c.ma_nguyen_lieu
     WHERE c.ma_phieu_nhap = ? ORDER BY c.ma_nguyen_lieu`, [maPhieu]);
  return rows;
}
// tu_ngay/den_ngay lọc theo NGÀY nhập (den_ngay tính trọn ngày); mới nhất trước
async function lichSuNhap({ tu_ngay, den_ngay, ma_ncc }, { limit, offset }, conn = pool) {
  const dk = []; const tham = [];
  if (tu_ngay) { dk.push('p.ngay_nhap >= ?'); tham.push(tu_ngay); }
  if (den_ngay) { dk.push('p.ngay_nhap < ? + INTERVAL 1 DAY'); tham.push(den_ngay); }
  if (ma_ncc) { dk.push('p.ma_ncc = ?'); tham.push(ma_ncc); }
  const where = dk.length ? `WHERE ${dk.join(' AND ')}` : '';
  const [[tongHop]] = await conn.query(`SELECT COUNT(*) AS tong, COALESCE(SUM(p.tong_tien_nhap), 0) AS tong_tien_nhap FROM PhieuNhap p ${where}`, tham);
  const [rows] = await conn.query(
    `SELECT ${COT_PHIEU}, (SELECT COUNT(*) FROM ChiTietNhap c WHERE c.ma_phieu_nhap = p.ma_phieu_nhap) AS so_dong
     ${TU_PHIEU} ${where} ORDER BY p.ngay_nhap DESC, p.ma_phieu_nhap DESC LIMIT ? OFFSET ?`, [...tham, limit, offset]);
  return { rows, tong: tongHop.tong, tong_tien_nhap: tongHop.tong_tien_nhap };
}

module.exports = {
  layCongThuc, xoaCongThuc, themCongThuc,
  khoaNccDeLapPhieu, taoPhieuNhap, themChiTietNhap, timPhieuNhap, layChiTietNhap, lichSuNhap,
  layCongThucVaTon, khoaNguyenLieu, truTon, congTon,
  timNguyenLieu, khoaMotNguyenLieu, taoNguyenLieu, suaNguyenLieu, xoaNguyenLieu, nguyenLieuDangDung, danhSachNguyenLieu, tonKho,
  timNcc, khoaNcc, taoNcc, suaNcc, nccDaCoPhieuNhap, xoaNcc, danhSachNcc,
};
