// san-pham – truy vấn CSDL (DanhMuc, SanPham; đọc CongThuc/NguyenLieu để tính số ly tối đa).
// Hàm nhận tham số cuối `conn` (mặc định pool) để dùng chung trong transaction.
const pool = require('../../config/db');

const escapeLike = s => s.replace(/[\\%_]/g, '\\$&');

// ---------- Danh mục ----------
async function dsDanhMuc(conn = pool) {
  const [rows] = await conn.query(
    `SELECT dm.ma_danh_muc, dm.ten_danh_muc, COUNT(sp.ma_san_pham) AS so_san_pham
     FROM DanhMuc dm LEFT JOIN SanPham sp ON sp.ma_danh_muc = dm.ma_danh_muc
     GROUP BY dm.ma_danh_muc, dm.ten_danh_muc ORDER BY dm.ten_danh_muc`);
  return rows;
}
async function timDanhMuc(ma, conn = pool) {
  const [rows] = await conn.query('SELECT ma_danh_muc, ten_danh_muc FROM DanhMuc WHERE ma_danh_muc = ?', [ma]);
  return rows[0] || null;
}
async function taoDanhMuc(ten, conn = pool) {
  const [r] = await conn.query('INSERT INTO DanhMuc (ten_danh_muc) VALUES (?)', [ten]);
  return r.insertId;
}
async function suaDanhMuc(ma, ten, conn = pool) {
  await conn.query('UPDATE DanhMuc SET ten_danh_muc = ? WHERE ma_danh_muc = ?', [ten, ma]);
}
async function xoaDanhMuc(ma, conn = pool) {
  await conn.query('DELETE FROM DanhMuc WHERE ma_danh_muc = ?', [ma]);
}
async function demSanPhamTrongDanhMuc(ma, conn = pool) {
  const [rows] = await conn.query('SELECT COUNT(*) AS n FROM SanPham WHERE ma_danh_muc = ?', [ma]);
  return rows[0].n;
}

// ---------- Sản phẩm ----------
const COT = 'sp.ma_san_pham, sp.ma_danh_muc, dm.ten_danh_muc, sp.ten_san_pham, sp.gia_ban, sp.trang_thai';
const TU = 'FROM SanPham sp JOIN DanhMuc dm ON dm.ma_danh_muc = sp.ma_danh_muc';

function bo_loc(f) {
  const dk = [];
  const tham = [];
  if (f.ma_danh_muc) { dk.push('sp.ma_danh_muc = ?'); tham.push(f.ma_danh_muc); }
  if (f.tu_khoa) { dk.push('sp.ten_san_pham LIKE ?'); tham.push(`%${escapeLike(f.tu_khoa)}%`); }
  if (f.trang_thai) { dk.push('sp.trang_thai = ?'); tham.push(f.trang_thai); }
  return { where: dk.length ? `WHERE ${dk.join(' AND ')}` : '', tham };
}

// POS-01: chỉ sản phẩm đang bán, kèm số ly tối đa theo tồn kho (NULL = chưa có công thức = không giới hạn)
async function menu(f, conn = pool) {
  const { where, tham } = bo_loc({ ...f, trang_thai: 'con_ban' });
  const [rows] = await conn.query(
    `SELECT ${COT}, t.so_ly_toi_da
     ${TU}
     LEFT JOIN (
       SELECT ct.ma_san_pham, MIN(FLOOR(nl.so_luong_ton / ct.dinh_luong)) AS so_ly_toi_da
       FROM CongThuc ct JOIN NguyenLieu nl ON nl.ma_nguyen_lieu = ct.ma_nguyen_lieu
       GROUP BY ct.ma_san_pham
     ) t ON t.ma_san_pham = sp.ma_san_pham
     ${where}
     ORDER BY dm.ten_danh_muc, sp.ten_san_pham`, tham);
  return rows;
}

async function danhSach(f, { limit, offset }, conn = pool) {
  const { where, tham } = bo_loc(f);
  const [rows] = await conn.query(
    `SELECT ${COT} ${TU} ${where} ORDER BY sp.ma_san_pham LIMIT ? OFFSET ?`, [...tham, limit, offset]);
  const [dem] = await conn.query(`SELECT COUNT(*) AS n ${TU} ${where}`, tham);
  return { rows, tong: dem[0].n };
}

async function timSanPham(ma, conn = pool) {
  const [rows] = await conn.query(`SELECT ${COT} ${TU} WHERE sp.ma_san_pham = ?`, [ma]);
  return rows[0] || null;
}
async function timNhieuSanPham(dsMa, conn = pool) {
  if (!dsMa.length) return [];
  const [rows] = await conn.query('SELECT ma_san_pham, ten_san_pham, gia_ban, trang_thai FROM SanPham WHERE ma_san_pham IN (?)', [dsMa]);
  return rows;
}
async function khoaSanPham(ma, conn) {
  const [rows] = await conn.query('SELECT ma_san_pham FROM SanPham WHERE ma_san_pham = ? FOR UPDATE', [ma]);
  return rows[0] || null;
}
async function khoaSanPhamCoTen(ma, conn) {
  const [rows] = await conn.query('SELECT ma_san_pham, ten_san_pham FROM SanPham WHERE ma_san_pham = ? FOR UPDATE', [ma]);
  return rows[0] || null;
}
async function taoSanPham(d, conn = pool) {
  const [r] = await conn.query(
    'INSERT INTO SanPham (ma_danh_muc, ten_san_pham, gia_ban, trang_thai) VALUES (?, ?, ?, ?)',
    [d.ma_danh_muc, d.ten_san_pham, d.gia_ban, d.trang_thai || 'con_ban']);
  return r.insertId;
}
const COT_SUA = ['ma_danh_muc', 'ten_san_pham', 'gia_ban', 'trang_thai'];
async function suaSanPham(ma, d, conn = pool) {
  const cot = COT_SUA.filter(c => d[c] !== undefined);
  await conn.query(`UPDATE SanPham SET ${cot.map(c => `${c} = ?`).join(', ')} WHERE ma_san_pham = ?`, [...cot.map(c => d[c]), ma]);
}
async function demChiTietHoaDon(ma, conn = pool) {
  const [rows] = await conn.query('SELECT COUNT(*) AS n FROM ChiTietHoaDon WHERE ma_san_pham = ?', [ma]);
  return rows[0].n;
}
async function xoaCongThuc(ma, conn) { await conn.query('DELETE FROM CongThuc WHERE ma_san_pham = ?', [ma]); }
async function xoaLienKetKhuyenMai(ma, conn) { await conn.query('DELETE FROM KhuyenMaiSanPham WHERE ma_san_pham = ?', [ma]); }
async function xoaSanPham(ma, conn) { await conn.query('DELETE FROM SanPham WHERE ma_san_pham = ?', [ma]); }

module.exports = {
  dsDanhMuc, timDanhMuc, taoDanhMuc, suaDanhMuc, xoaDanhMuc, demSanPhamTrongDanhMuc,
  menu, danhSach, timSanPham, timNhieuSanPham, khoaSanPham, taoSanPham, suaSanPham, demChiTietHoaDon,
  xoaCongThuc, xoaLienKetKhuyenMai, xoaSanPham, khoaSanPhamCoTen,
};
