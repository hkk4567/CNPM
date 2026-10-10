// withTransaction(fn, { khoa, giayCho }): fn nhận connection; thành công thì COMMIT, ném lỗi thì ROLLBACK.
// Tùy chọn `khoa`: giữ một khóa tên (GET_LOCK) SUỐT transaction để các transaction cùng khóa chạy nối tiếp nhau
// (ví dụ cấp so_thu_tu hóa đơn không trùng).
// Gặp deadlock (1213) hoặc 'table definition has changed' (1412) thì tự chạy lại tối đa 8 lần; lỗi khác ném ra ngay. Khóa lấy TRƯỚC khi BEGIN và nhả SAU COMMIT/ROLLBACK.
const pool = require('../config/db');
const { db } = require('../config/env');
const { LoiNghiepVu } = require('./loi-nghiep-vu');

const SO_LAN_THU = 8;
const nghi = lan => new Promise(r => setTimeout(r, 20 * lan + Math.random() * 60));
const { laLoiThuLai } = require('./loi-thu-lai');

async function withTransaction(fn, { khoa, giayCho = 10 } = {}) {
  const conn = await pool.getConnection();
  const tenKhoa = khoa ? `${db.database}:${khoa}` : null;
  let giuKhoa = false;
  try {
    if (tenKhoa) {
      const [rows] = await conn.query('SELECT GET_LOCK(?, ?) AS ok', [tenKhoa, giayCho]);
      if (Number(rows[0].ok) !== 1) throw new LoiNghiepVu(503, 'HE_THONG_BAN', 'Hệ thống đang bận, vui lòng thử lại');
      giuKhoa = true;
    }
    for (let lan = 1; ; lan++) {
      try {
        await conn.beginTransaction();
        const ketQua = await fn(conn);
        await conn.commit();
        return ketQua;
      } catch (e) {
        try { await conn.rollback(); } catch (_) { /* bỏ qua lỗi rollback, giữ lỗi gốc */ }
        // Deadlock/đổi định nghĩa bảng: CSDL đã hủy cả giao dịch nên chạy lại từ đầu là an toàn (fn chỉ làm việc trong CSDL)
        if (!laLoiThuLai(e) || lan >= SO_LAN_THU) throw e;
        await nghi(lan);
      }
    }
  } finally {
    if (giuKhoa) {
      try { await conn.query('SELECT RELEASE_LOCK(?)', [tenKhoa]); } catch (_) { /* kết nối hỏng thì khóa tự nhả */ }
    }
    conn.release();
  }
}

module.exports = { withTransaction };
