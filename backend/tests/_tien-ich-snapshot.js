// Tiện ích dùng chung cho test (tên bắt đầu bằng _ và không kết thúc .test.js nên node --test không chạy như một file test).
// HoaDonDaThanhToan là bảng chỉ-thêm: 2 trigger chặn UPDATE/DELETE. Muốn dọn dòng snapshot của dữ liệu TEST_ thì phải tháo trigger DELETE
// rồi dựng lại. Vì các file test chạy SONG SONG trên một CSDL, mọi thao tác tháo/dựng và mọi test KIỂM TRA trigger đều phải giữ cùng một khóa
// (GET_LOCK) để file này không tháo trigger đúng lúc file kia đang kiểm tra nó.
const KHOA = 'test:trigger_hoadondathanhtoan';
const TEN_TRIGGER = 'trg_readonly_hoadondathanhtoan_delete';

async function voiKhoaTrigger(pool, fn) {
  const conn = await pool.getConnection();
  try {
    const [r] = await conn.query('SELECT GET_LOCK(?, 60) AS ok', [KHOA]);
    if (Number(r[0].ok) !== 1) throw new Error('Không lấy được khóa test trigger');
    return await fn();
  } finally {
    try { await conn.query('SELECT RELEASE_LOCK(?)', [KHOA]); } catch (_) { /* kết nối hỏng thì khóa tự nhả */ }
    conn.release();
  }
}

// Xóa các dòng snapshot của những hóa đơn test (chỉ dùng trong CSDL test/dev). Luôn dựng lại trigger sau khi xóa.
function xoaSnapshot(pool, dsMaHoaDon) {
  if (!dsMaHoaDon.length) return Promise.resolve();
  return voiKhoaTrigger(pool, async () => {
    await pool.query(`DROP TRIGGER IF EXISTS ${TEN_TRIGGER}`);
    try {
      await pool.query('DELETE FROM HoaDonDaThanhToan WHERE ma_hoa_don IN (?)', [dsMaHoaDon]);
    } finally {
      await pool.query(`CREATE TRIGGER ${TEN_TRIGGER} BEFORE DELETE ON HoaDonDaThanhToan FOR EACH ROW
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'LỖI: Bảng HoaDonDaThanhToan chỉ được phép thêm mới, tuyệt đối không được sửa hay xóa!'`);
    }
  });
}

module.exports = { voiKhoaTrigger, xoaSnapshot };
