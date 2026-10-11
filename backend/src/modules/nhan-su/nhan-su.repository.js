// nhan-su – truy vấn CSDL (NhanVien + TaiKhoan; 9b: CaLamViec, PhanCong). Hàm nhận `conn` (mặc định pool).
const pool = require('../../config/db');

const COT = `nv.ma_nhan_vien, nv.ho_ten, nv.chuc_vu, nv.so_dien_thoai, nv.trang_thai,
  tk.ma_tai_khoan, tk.ten_dang_nhap, tk.quyen_truy_cap`;
const TU = 'FROM NhanVien nv LEFT JOIN TaiKhoan tk ON tk.ma_nhan_vien = nv.ma_nhan_vien';
const escapeLike = x => x.replace(/[\\%_]/g, '\\$&');

async function timNhanVien(ma, conn = pool) {
  const [rows] = await conn.query(`SELECT ${COT} ${TU} WHERE nv.ma_nhan_vien = ?`, [ma]);
  return rows[0] || null;
}

// Khóa dòng nhân viên (FOR UPDATE; không JOIN để không khóa lan sang TaiKhoan) rồi đọc lại bản đầy đủ
async function khoaNhanVien(ma, conn) {
  const [rows] = await conn.query('SELECT ma_nhan_vien FROM NhanVien WHERE ma_nhan_vien = ? FOR UPDATE', [ma]);
  return rows.length ? timNhanVien(ma, conn) : null;
}

async function taoNhanVien({ ho_ten, chuc_vu, so_dien_thoai = null }, conn) {
  const [r] = await conn.query('INSERT INTO NhanVien (ho_ten, chuc_vu, so_dien_thoai) VALUES (?, ?, ?)', [ho_ten, chuc_vu, so_dien_thoai]);
  return r.insertId;
}
async function taoTaiKhoan({ ma_nhan_vien, ten_dang_nhap, mat_khau_hash, quyen_truy_cap }, conn) {
  const [r] = await conn.query('INSERT INTO TaiKhoan (ma_nhan_vien, ten_dang_nhap, mat_khau_hash, quyen_truy_cap) VALUES (?, ?, ?, ?)',
    [ma_nhan_vien, ten_dang_nhap, mat_khau_hash, quyen_truy_cap]);
  return r.insertId;
}

const COT_SUA_NV = ['ho_ten', 'chuc_vu', 'so_dien_thoai'];
async function suaThongTin(ma, truong, conn) {
  const cot = COT_SUA_NV.filter(c => truong[c] !== undefined);
  if (!cot.length) return;
  await conn.query(`UPDATE NhanVien SET ${cot.map(c => `${c} = ?`).join(', ')} WHERE ma_nhan_vien = ?`, [...cot.map(c => truong[c]), ma]);
}
async function doiQuyen(ma, quyen, conn) {
  await conn.query('UPDATE TaiKhoan SET quyen_truy_cap = ? WHERE ma_nhan_vien = ?', [quyen, ma]);
}
async function datMatKhau(ma, hash, conn) {
  await conn.query('UPDATE TaiKhoan SET mat_khau_hash = ? WHERE ma_nhan_vien = ?', [hash, ma]);
}
async function datNghiViec(ma, conn) {
  await conn.query("UPDATE NhanVien SET trang_thai = 'nghi_viec' WHERE ma_nhan_vien = ?", [ma]);
}

// Số admin ĐANG LÀM (có tài khoản admin và nhân viên dang_lam). Gọi trong withTransaction có khóa 'nhan_su' nên không bị đổi giữa chừng.
async function demAdminDangLam(conn) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS n FROM TaiKhoan tk JOIN NhanVien nv ON nv.ma_nhan_vien = tk.ma_nhan_vien
     WHERE tk.quyen_truy_cap = 'admin' AND nv.trang_thai = 'dang_lam'`);
  return rows[0].n;
}

// NS-03: nhân viên đã gắn với dữ liệu lịch sử? (hóa đơn, phiếu nhập, phân công TRƯỚC hôm nay)
async function lichSuLienQuan(ma, conn) {
  const [rows] = await conn.query(
    `SELECT EXISTS(SELECT 1 FROM HoaDon WHERE ma_nhan_vien = ?) AS hoa_don,
            EXISTS(SELECT 1 FROM PhieuNhap WHERE ma_nhan_vien = ?) AS phieu_nhap,
            EXISTS(SELECT 1 FROM PhanCong WHERE ma_nhan_vien = ? AND ngay_lam < CURDATE()) AS phan_cong_cu`, [ma, ma, ma]);
  const r = rows[0];
  return { hoa_don: !!r.hoa_don, phieu_nhap: !!r.phieu_nhap, phan_cong_cu: !!r.phan_cong_cu };
}
// Phân công từ hôm nay trở đi (chưa diễn ra hết)
async function goPhanCongTuongLai(ma, conn) {
  const [r] = await conn.query('DELETE FROM PhanCong WHERE ma_nhan_vien = ? AND ngay_lam >= CURDATE()', [ma]);
  return r.affectedRows;
}
async function xoaTaiKhoan(ma, conn) { await conn.query('DELETE FROM TaiKhoan WHERE ma_nhan_vien = ?', [ma]); }
async function xoaNhanVien(ma, conn) { await conn.query('DELETE FROM NhanVien WHERE ma_nhan_vien = ?', [ma]); }

async function danhSachNhanVien({ tu_khoa, trang_thai, quyen_truy_cap }, { limit, offset }, conn = pool) {
  const dk = []; const tham = [];
  if (tu_khoa) { dk.push('(nv.ho_ten LIKE ? OR nv.so_dien_thoai LIKE ? OR tk.ten_dang_nhap LIKE ?)'); const m = `%${escapeLike(tu_khoa)}%`; tham.push(m, m, m); }
  if (trang_thai) { dk.push('nv.trang_thai = ?'); tham.push(trang_thai); }
  if (quyen_truy_cap) { dk.push('tk.quyen_truy_cap = ?'); tham.push(quyen_truy_cap); }
  const where = dk.length ? `WHERE ${dk.join(' AND ')}` : '';
  const [[{ tong }]] = await conn.query(`SELECT COUNT(*) AS tong ${TU} ${where}`, tham);
  const [rows] = await conn.query(`SELECT ${COT} ${TU} ${where} ORDER BY nv.ma_nhan_vien LIMIT ? OFFSET ?`, [...tham, limit, offset]);
  return { rows, tong };
}

// ---------- NS-04 ca làm việc ----------
const COT_CA = "ma_ca, ten_ca, TIME_FORMAT(thoi_gian_bat_dau, '%H:%i:%s') AS thoi_gian_bat_dau, TIME_FORMAT(thoi_gian_ket_thuc, '%H:%i:%s') AS thoi_gian_ket_thuc";

async function timCa(ma, conn = pool) {
  const [rows] = await conn.query(`SELECT ${COT_CA} FROM CaLamViec WHERE ma_ca = ?`, [ma]);
  return rows[0] || null;
}
async function khoaCa(ma, conn) {
  const [rows] = await conn.query(`SELECT ${COT_CA} FROM CaLamViec WHERE ma_ca = ? FOR UPDATE`, [ma]);
  return rows[0] || null;
}
// Khóa CHIA SẺ khi xếp lịch: nhiều người xếp cùng ca được, nhưng xóa ca (FOR UPDATE) phải chờ
async function khoaCaDeXep(ma, conn) {
  const [rows] = await conn.query(`SELECT ma_ca, ten_ca FROM CaLamViec WHERE ma_ca = ? LOCK IN SHARE MODE`, [ma]);
  return rows[0] || null;
}
async function tatCaCa(conn = pool) {
  const [rows] = await conn.query(`SELECT ${COT_CA}, (SELECT COUNT(*) FROM PhanCong p WHERE p.ma_ca = c.ma_ca) AS so_phan_cong FROM CaLamViec c ORDER BY thoi_gian_bat_dau, ma_ca`);
  return rows;
}
async function taoCa({ ten_ca, thoi_gian_bat_dau, thoi_gian_ket_thuc }, conn = pool) {
  const [r] = await conn.query('INSERT INTO CaLamViec (ten_ca, thoi_gian_bat_dau, thoi_gian_ket_thuc) VALUES (?, ?, ?)', [ten_ca, thoi_gian_bat_dau, thoi_gian_ket_thuc]);
  return r.insertId;
}
const COT_SUA_CA = ['ten_ca', 'thoi_gian_bat_dau', 'thoi_gian_ket_thuc'];
async function suaCa(ma, truong, conn) {
  const cot = COT_SUA_CA.filter(c => truong[c] !== undefined);
  await conn.query(`UPDATE CaLamViec SET ${cot.map(c => `${c} = ?`).join(', ')} WHERE ma_ca = ?`, [...cot.map(c => truong[c]), ma]);
}
async function caDaCoPhanCong(ma, conn) {
  const [rows] = await conn.query('SELECT 1 AS co FROM PhanCong WHERE ma_ca = ? LIMIT 1', [ma]);
  return rows.length > 0;
}
async function xoaCa(ma, conn) { await conn.query('DELETE FROM CaLamViec WHERE ma_ca = ?', [ma]); }

// ---------- NS-05..07 phân công ----------
const COT_PC = `DATE_FORMAT(pc.ngay_lam, '%Y-%m-%d') AS ngay_lam, pc.ma_ca, c.ten_ca,
  TIME_FORMAT(c.thoi_gian_bat_dau, '%H:%i:%s') AS thoi_gian_bat_dau, TIME_FORMAT(c.thoi_gian_ket_thuc, '%H:%i:%s') AS thoi_gian_ket_thuc,
  pc.ma_nhan_vien, nv.ho_ten`;
const TU_PC = 'FROM PhanCong pc JOIN CaLamViec c ON c.ma_ca = pc.ma_ca JOIN NhanVien nv ON nv.ma_nhan_vien = pc.ma_nhan_vien';

// Khóa CHIA SẺ nhân viên khi xếp lịch (NS-03 cho nghỉ việc khóa FOR UPDATE nên không lọt người vừa nghỉ); trả trang_thai mới nhất
async function khoaNhanVienDeXep(ma, conn) {
  const [rows] = await conn.query('SELECT ma_nhan_vien, ho_ten, trang_thai FROM NhanVien WHERE ma_nhan_vien = ? LOCK IN SHARE MODE', [ma]);
  return rows[0] || null;
}
async function homNay(conn = pool) {
  const [rows] = await conn.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS d, DATE_FORMAT(CURDATE() - INTERVAL WEEKDAY(CURDATE()) DAY, '%Y-%m-%d') AS thu_hai");
  return rows[0];
}
// Những ngày (trong dsNgay) đã được xếp cho đúng nhân viên + ca; đọc KHÔNG khóa (khóa chính chặn trùng là chốt cuối)
async function ngayDaXep(maNv, maCa, dsNgay, conn) {
  const [rows] = await conn.query("SELECT DATE_FORMAT(ngay_lam, '%Y-%m-%d') AS d FROM PhanCong WHERE ma_nhan_vien = ? AND ma_ca = ? AND ngay_lam IN (?)", [maNv, maCa, dsNgay]);
  return rows.map(r => r.d);
}
async function themPhanCong(maNv, maCa, dsNgay, conn) {
  await conn.query('INSERT INTO PhanCong (ma_nhan_vien, ma_ca, ngay_lam) VALUES ?', [dsNgay.map(d => [maNv, maCa, d])]);
}
async function layPhanCong(maNv, maCa, dsNgay, conn = pool) {
  const [rows] = await conn.query(`SELECT ${COT_PC} ${TU_PC} WHERE pc.ma_nhan_vien = ? AND pc.ma_ca = ? AND pc.ngay_lam IN (?) ORDER BY pc.ngay_lam`, [maNv, maCa, dsNgay]);
  return rows;
}
async function goPhanCong(maNv, maCa, ngay, conn) {
  const [r] = await conn.query('DELETE FROM PhanCong WHERE ma_nhan_vien = ? AND ma_ca = ? AND ngay_lam = ?', [maNv, maCa, ngay]);
  return r.affectedRows;
}
// NS-07: 7 ngày từ tuNgay (đã là thứ Hai); maNv tùy chọn
async function lichTuan(tuNgay, maNv, conn = pool) {
  const dk = ['pc.ngay_lam >= ?', 'pc.ngay_lam < ? + INTERVAL 7 DAY']; const tham = [tuNgay, tuNgay];
  if (maNv) { dk.push('pc.ma_nhan_vien = ?'); tham.push(maNv); }
  const [rows] = await conn.query(
    `SELECT ${COT_PC} ${TU_PC} WHERE ${dk.join(' AND ')} ORDER BY pc.ngay_lam, c.thoi_gian_bat_dau, pc.ma_ca, nv.ho_ten, pc.ma_nhan_vien`, tham);
  return rows;
}

module.exports = {
  timCa, khoaCa, khoaCaDeXep, tatCaCa, taoCa, suaCa, caDaCoPhanCong, xoaCa,
  khoaNhanVienDeXep, homNay, ngayDaXep, themPhanCong, layPhanCong, goPhanCong, lichTuan,
  timNhanVien, khoaNhanVien, taoNhanVien, taoTaiKhoan, suaThongTin, doiQuyen, datMatKhau, datNghiViec,
  demAdminDangLam, lichSuLienQuan, goPhanCongTuongLai, xoaTaiKhoan, xoaNhanVien, danhSachNhanVien,
};
