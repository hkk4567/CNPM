// Test tiện ích dùng chung: phân trang, thông báo thiếu nguyên liệu, transaction (cần MySQL + dữ liệu mẫu).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'khoa-chi-dung-cho-test';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/config/db');
const { layPhanTrang } = require('../src/utils/phan-trang');
const { loi } = require('../src/utils/loi-nghiep-vu');
const { withTransaction } = require('../src/utils/transaction');

after(() => pool.end());

test('phân trang: mặc định, giới hạn, giá trị rác', () => {
  assert.deepEqual(layPhanTrang({}), { trang: 1, moi_trang: 20, limit: 20, offset: 0 });
  assert.deepEqual(layPhanTrang({ trang: '3', moi_trang: '10' }), { trang: 3, moi_trang: 10, limit: 10, offset: 20 });
  assert.equal(layPhanTrang({ moi_trang: '9999' }).moi_trang, 100);
  assert.equal(layPhanTrang({ trang: '-5', moi_trang: 'abc' }).trang, 1);
  assert.equal(layPhanTrang({ moi_trang: 'abc' }).moi_trang, 20);
});

test('thông báo thiếu nguyên liệu đúng ví dụ của người dùng (cần 5g, còn 4g)', () => {
  const e = loi.khongDuNguyenLieu([{ ten_nguyen_lieu: 'Cà phê hạt', don_vi_tinh: 'g', can_dung: 5, so_luong_ton: 4, con_thieu: 1 }]);
  assert.equal(e.status, 409);
  assert.equal(e.ma, 'KHONG_DU_NGUYEN_LIEU');
  assert.equal(e.message, 'Không đủ nguyên liệu: Cà phê hạt cần 5 g, còn 4 g (thiếu 1 g)');
});

test('thông báo nhiều nguyên liệu, số thập phân, tự tính phần thiếu', () => {
  const e = loi.khongDuNguyenLieu([
    { ten_nguyen_lieu: 'Cà phê bột', don_vi_tinh: 'g', can_dung: 20, so_luong_ton: 4 },
    { ten_nguyen_lieu: 'Sữa tươi', don_vi_tinh: 'ml', can_dung: 100.5, so_luong_ton: 100 },
  ]);
  assert.equal(e.message,
    'Không đủ nguyên liệu: Cà phê bột cần 20 g, còn 4 g (thiếu 16 g); Sữa tươi cần 100.5 ml, còn 100 ml (thiếu 0.5 ml)');
});

test('transaction: lỗi giữa chừng thì ROLLBACK, thành công thì COMMIT', async () => {
  const sdt = '0999000111';
  await pool.query('DELETE FROM KhachHang WHERE so_dien_thoai = ?', [sdt]);
  const dem = async () => (await pool.query('SELECT COUNT(*) AS n FROM KhachHang WHERE so_dien_thoai = ?', [sdt]))[0][0].n;

  await assert.rejects(withTransaction(async conn => {
    await conn.query('INSERT INTO KhachHang (ten_khach_hang, so_dien_thoai) VALUES (?, ?)', ['Thử rollback', sdt]);
    throw new Error('lỗi giả');
  }), /lỗi giả/);
  assert.equal(await dem(), 0, 'phải rollback');

  await withTransaction(conn => conn.query('INSERT INTO KhachHang (ten_khach_hang, so_dien_thoai) VALUES (?, ?)', ['Thử commit', sdt]));
  assert.equal(await dem(), 1, 'phải commit');
  await pool.query('DELETE FROM KhachHang WHERE so_dien_thoai = ?', [sdt]);
});

test('transaction có khóa tên: nhả khóa sau khi xong, kể cả khi lỗi', async () => {
  const { db } = require('../src/config/env');
  const tenKhoa = `${db.database}:khoa_thu_nghiem`;
  const conLaKhoaTu = async () => Number((await pool.query('SELECT IS_FREE_LOCK(?) AS tu_do', [tenKhoa]))[0][0].tu_do);

  await withTransaction(async () => {
    assert.equal(await conLaKhoaTu(), 0, 'đang chạy thì khóa phải đang bị giữ');
  }, { khoa: 'khoa_thu_nghiem' });
  assert.equal(await conLaKhoaTu(), 1, 'xong thì khóa phải được nhả');

  await assert.rejects(withTransaction(async () => { throw new Error('lỗi giả'); }, { khoa: 'khoa_thu_nghiem' }), /lỗi giả/);
  assert.equal(await conLaKhoaTu(), 1, 'lỗi thì khóa vẫn phải được nhả');
});
