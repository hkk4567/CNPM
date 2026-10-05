// Test kho.service: kiểm tra đủ nguyên liệu (quy tắc tồn kho không âm). Phần hàm thuần không cần CSDL.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'khoa-chi-dung-cho-test';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { tinhThieu } = require('../src/modules/kho/kho.service');

const congThuc = [
  { ma_san_pham: 1, ma_nguyen_lieu: 10, dinh_luong: 20, ten_nguyen_lieu: 'Cà phê bột', don_vi_tinh: 'g', so_luong_ton: 100 },
  { ma_san_pham: 1, ma_nguyen_lieu: 11, dinh_luong: 10, ten_nguyen_lieu: 'Đường', don_vi_tinh: 'g', so_luong_ton: 1000 },
  { ma_san_pham: 2, ma_nguyen_lieu: 10, dinh_luong: 15, ten_nguyen_lieu: 'Cà phê bột', don_vi_tinh: 'g', so_luong_ton: 100 },
];

test('đủ nguyên liệu -> không thiếu gì (đúng bằng tồn cũng tính là đủ)', () => {
  assert.deepEqual(tinhThieu([{ ma_san_pham: 1, so_luong: 5 }], congThuc), []); // cần đúng 100g, tồn 100g
});

test('thiếu: báo đúng phần thiếu', () => {
  const t = tinhThieu([{ ma_san_pham: 1, so_luong: 6 }], congThuc); // cần 120g, tồn 100g
  assert.equal(t.length, 1);
  assert.deepEqual(
    { ten: t[0].ten_nguyen_lieu, can: t[0].can_dung, ton: t[0].so_luong_ton, thieu: t[0].con_thieu, dv: t[0].don_vi_tinh },
    { ten: 'Cà phê bột', can: 120, ton: 100, thieu: 20, dv: 'g' });
});

test('gộp nhu cầu theo nguyên liệu trên NHIỀU dòng/sản phẩm: từng dòng đủ nhưng tổng thì thiếu', () => {
  // dòng 1: 4 ly SP1 = 80g (đủ); dòng 2: 2 ly SP2 = 30g (đủ); tổng 110g > 100g
  const t = tinhThieu([{ ma_san_pham: 1, so_luong: 4 }, { ma_san_pham: 2, so_luong: 2 }], congThuc);
  assert.equal(t.length, 1);
  assert.equal(t[0].can_dung, 110);
  assert.equal(t[0].con_thieu, 10);
});

test('sản phẩm chưa có công thức: không giới hạn; không có dòng nào: không thiếu', () => {
  assert.deepEqual(tinhThieu([{ ma_san_pham: 99, so_luong: 1000 }], congThuc), []);
  assert.deepEqual(tinhThieu([], congThuc), []);
});

test('số thập phân không bị lỗi làm tròn nhị phân (0.1 x 3)', () => {
  const ct = [{ ma_san_pham: 1, ma_nguyen_lieu: 1, dinh_luong: 0.1, ten_nguyen_lieu: 'X', don_vi_tinh: 'kg', so_luong_ton: 0.3 }];
  assert.deepEqual(tinhThieu([{ ma_san_pham: 1, so_luong: 3 }], ct), []);
});
