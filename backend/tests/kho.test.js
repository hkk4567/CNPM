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

// ---------- truKho / traKho trên CSDL (dữ liệu riêng TEST_KHO_*) ----------
const { before, after } = require('node:test');
const pool = require('../src/config/db');
const { truKho, traKho } = require('../src/modules/kho/kho.service');
const { withTransaction } = require('../src/utils/transaction');

let sp1; let sp2; let spKhong; let nl1; let nl2;
const ton = async ma => Number((await pool.query('SELECT so_luong_ton FROM NguyenLieu WHERE ma_nguyen_lieu = ?', [ma]))[0][0].so_luong_ton);
const datTon = async (a, b) => {
  await pool.query('UPDATE NguyenLieu SET so_luong_ton = ? WHERE ma_nguyen_lieu = ?', [a, nl1]);
  await pool.query('UPDATE NguyenLieu SET so_luong_ton = ? WHERE ma_nguyen_lieu = ?', [b, nl2]);
};
async function donDep() {
  await pool.query("DELETE ct FROM CongThuc ct JOIN SanPham s ON s.ma_san_pham = ct.ma_san_pham WHERE s.ten_san_pham LIKE 'TEST\\_KHO\\_%'");
  await pool.query("DELETE FROM SanPham WHERE ten_san_pham LIKE 'TEST\\_KHO\\_%'");
  await pool.query("DELETE FROM NguyenLieu WHERE ten_nguyen_lieu LIKE 'TEST\\_KHO\\_%'");
  await pool.query("DELETE FROM DanhMuc WHERE ten_danh_muc LIKE 'TEST\\_KHO\\_%'");
}

before(async () => {
  await donDep();
  const dm = (await pool.query("INSERT INTO DanhMuc (ten_danh_muc) VALUES ('TEST_KHO_DM')"))[0].insertId;
  const taoSp = async ten => (await pool.query('INSERT INTO SanPham (ma_danh_muc, ten_san_pham, gia_ban) VALUES (?, ?, 1000)', [dm, ten]))[0].insertId;
  sp1 = await taoSp('TEST_KHO_SP1'); sp2 = await taoSp('TEST_KHO_SP2'); spKhong = await taoSp('TEST_KHO_SPK');
  nl1 = (await pool.query("INSERT INTO NguyenLieu (ten_nguyen_lieu, don_vi_tinh, so_luong_ton, muc_ton_toi_thieu) VALUES ('TEST_KHO_NL1', 'g', 100, 70)"))[0].insertId;
  nl2 = (await pool.query("INSERT INTO NguyenLieu (ten_nguyen_lieu, don_vi_tinh, so_luong_ton, muc_ton_toi_thieu) VALUES ('TEST_KHO_NL2', 'ml', 50, 0)"))[0].insertId;
  // SP1: 20g NL1 + 5ml NL2 mỗi ly; SP2: 10g NL1 mỗi ly; SPK: không công thức
  await pool.query('INSERT INTO CongThuc (ma_san_pham, ma_nguyen_lieu, dinh_luong) VALUES (?, ?, 20), (?, ?, 5), (?, ?, 10)', [sp1, nl1, sp1, nl2, sp2, nl1]);
});
after(async () => { await donDep(); await pool.end(); });

test('truKho: trừ đúng theo công thức, gộp nhiều món dùng chung nguyên liệu, cảnh báo khi tồn <= mức tối thiểu', async () => {
  await datTon(100, 50);
  const kq = await withTransaction(conn => truKho([{ ma_san_pham: sp1, so_luong: 2 }, { ma_san_pham: sp2, so_luong: 1 }, { ma_san_pham: spKhong, so_luong: 9 }], conn));
  assert.equal(await ton(nl1), 50, '100 - (2 x 20 + 1 x 10)');
  assert.equal(await ton(nl2), 40, '50 - 2 x 5');
  assert.deepEqual(kq.canh_bao_kho, [{ ma_nguyen_lieu: nl1, ten_nguyen_lieu: 'TEST_KHO_NL1', don_vi_tinh: 'g', so_luong_ton: 50, muc_ton_toi_thieu: 70 }]);
});

test('truKho: thiếu thì ném 409 đủ số liệu và KHÔNG trừ gì (kể cả nguyên liệu còn đủ)', async () => {
  await datTon(100, 3); // NL2 chỉ còn 3ml, 1 ly SP1 cần 5ml
  await assert.rejects(
    withTransaction(conn => truKho([{ ma_san_pham: sp1, so_luong: 1 }], conn)),
    e => e.status === 409 && e.ma === 'KHONG_DU_NGUYEN_LIEU' && e.chiTiet.length === 1
      && e.chiTiet[0].ten_nguyen_lieu === 'TEST_KHO_NL2' && e.chiTiet[0].con_thieu === 2
      && e.message === 'Không đủ nguyên liệu: TEST_KHO_NL2 cần 5 ml, còn 3 ml (thiếu 2 ml)');
  assert.equal(await ton(nl1), 100, 'NL1 đủ nhưng không được trừ khi có nguyên liệu khác thiếu');
  assert.equal(await ton(nl2), 3);
});

test('traKho: cộng lại đúng theo công thức; món không công thức thì không làm gì', async () => {
  await datTon(50, 40);
  await withTransaction(conn => traKho([{ ma_san_pham: sp1, so_luong: 2 }, { ma_san_pham: sp2, so_luong: 1 }, { ma_san_pham: spKhong, so_luong: 5 }], conn));
  assert.equal(await ton(nl1), 100, '50 + 2 x 20 + 1 x 10');
  assert.equal(await ton(nl2), 50, '40 + 2 x 5');
  await withTransaction(conn => traKho([{ ma_san_pham: spKhong, so_luong: 5 }], conn));
  assert.equal(await ton(nl1), 100);
});

test('trừ rồi trả cùng số ly thì kho về đúng như cũ; transaction hỏng giữa chừng thì cả trừ lẫn trả đều bị hủy', async () => {
  await datTon(100, 50);
  await withTransaction(async conn => { await truKho([{ ma_san_pham: sp1, so_luong: 3 }], conn); await traKho([{ ma_san_pham: sp1, so_luong: 3 }], conn); });
  assert.equal(await ton(nl1), 100);
  assert.equal(await ton(nl2), 50);

  await assert.rejects(withTransaction(async conn => { await truKho([{ ma_san_pham: sp1, so_luong: 3 }], conn); throw new Error('lỗi giả'); }), /lỗi giả/);
  assert.equal(await ton(nl1), 100, 'ROLLBACK: lần trừ không còn hiệu lực');
  assert.equal(await ton(nl2), 50);
});

test('hai transaction trừ kho đồng thời: chạy nối tiếp, tồn không bao giờ âm', async () => {
  await datTon(100, 50); // mỗi giao dịch cần 60g NL1 (3 ly SP1): chỉ đủ cho một
  const ketQua = await Promise.allSettled([
    withTransaction(conn => truKho([{ ma_san_pham: sp1, so_luong: 3 }], conn)),
    withTransaction(conn => truKho([{ ma_san_pham: sp1, so_luong: 3 }], conn)),
  ]);
  assert.deepEqual(ketQua.map(k => k.status).sort(), ['fulfilled', 'rejected']);
  assert.equal(ketQua.find(k => k.status === 'rejected').reason.ma, 'KHONG_DU_NGUYEN_LIEU');
  assert.equal(await ton(nl1), 40);
  assert.equal(await ton(nl2), 35);
});
