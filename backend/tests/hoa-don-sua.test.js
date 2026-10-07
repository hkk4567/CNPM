// Test chỉnh sửa order: POS-03 (thêm dòng), POS-04 (sửa dòng), POS-05 (xóa dòng), POS-07 (đổi trạng thái), POS-09 (hủy)
// với QUY TẮC KHO MỚI: gọi món -> trừ ngay; bỏ ly CHƯA làm -> trả lại; bỏ ly ĐÃ làm (da_lam) -> nguyên liệu vẫn bị trừ.
// Dữ liệu riêng TEST_HS_*: SP có công thức (10.000đ, 20g NL/ly), SPK không công thức, NL tồn đặt lại trong từng test.
// Không đặt món có công thức của dữ liệu mẫu (gọi món là trừ kho thật, dọn order không hoàn lại tồn kho mẫu).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'khoa-chi-dung-cho-test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const pool = require('../src/config/db');
const { taoApp } = require('../src/app');

const app = taoApp();
const token = {};
const taoRa = [];
let sp; let spk; let nl;

const goi = (pt, duong, ten = 'nhanvien') => {
  const r = request(app)[pt](duong);
  return ten ? r.set('Authorization', `Bearer ${token[ten]}`) : r;
};
const datTon = n => pool.query('UPDATE NguyenLieu SET so_luong_ton = ? WHERE ma_nguyen_lieu = ?', [n, nl]);
const ton = async () => Number((await pool.query('SELECT so_luong_ton FROM NguyenLieu WHERE ma_nguyen_lieu = ?', [nl]))[0][0].so_luong_ton);
const dem = async ma => (await pool.query('SELECT COUNT(*) AS n FROM ChiTietHoaDon WHERE ma_hoa_don = ?', [ma]))[0][0].n;
const trangThai = async ma => (await pool.query('SELECT trang_thai FROM HoaDon WHERE ma_hoa_don = ?', [ma]))[0][0].trang_thai;

// Tạo order qua API; mặc định 1 dòng Bánh tiramisu (sản phẩm mẫu số 7, KHÔNG có công thức nên không đụng kho)
async function taoOrder(items = [{ ma_san_pham: 7, so_luong: 1 }]) {
  const res = await goi('post', '/api/hoa-don').send({ items });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  taoRa.push(res.body.data.ma_hoa_don);
  return res.body.data;
}
const duongDong = (hd, i = 0) => `/api/hoa-don/${hd.ma_hoa_don}/dong/${hd.chi_tiet[i].ma_chi_tiet}`;

async function donDep() {
  if (taoRa.length) {
    await pool.query('DELETE FROM ChiTietHoaDon WHERE ma_hoa_don IN (?)', [taoRa]);
    await pool.query('DELETE FROM HoaDon WHERE ma_hoa_don IN (?)', [taoRa]);
  }
  await pool.query("DELETE c FROM ChiTietHoaDon c JOIN SanPham s ON s.ma_san_pham = c.ma_san_pham WHERE s.ten_san_pham LIKE 'TEST\\_HS\\_%'");
  await pool.query("DELETE ct FROM CongThuc ct JOIN SanPham s ON s.ma_san_pham = ct.ma_san_pham WHERE s.ten_san_pham LIKE 'TEST\\_HS\\_%'");
  await pool.query("DELETE FROM SanPham WHERE ten_san_pham LIKE 'TEST\\_HS\\_%'");
  await pool.query("DELETE FROM NguyenLieu WHERE ten_nguyen_lieu LIKE 'TEST\\_HS\\_%'");
  await pool.query("DELETE FROM DanhMuc WHERE ten_danh_muc LIKE 'TEST\\_HS\\_%'");
}

before(async () => {
  await donDep();
  for (const [ten, mk] of [['admin', 'Admin@123'], ['quanly', 'Quanly@123'], ['nhanvien', 'Nhanvien@123']]) {
    token[ten] = (await request(app).post('/api/auth/dang-nhap').send({ ten_dang_nhap: ten, mat_khau: mk })).body.data.token;
  }
  const dm = (await pool.query("INSERT INTO DanhMuc (ten_danh_muc) VALUES ('TEST_HS_DM')"))[0].insertId;
  sp = (await pool.query('INSERT INTO SanPham (ma_danh_muc, ten_san_pham, gia_ban) VALUES (?, ?, 10000)', [dm, 'TEST_HS_SP']))[0].insertId;
  spk = (await pool.query('INSERT INTO SanPham (ma_danh_muc, ten_san_pham, gia_ban) VALUES (?, ?, 10000)', [dm, 'TEST_HS_SPK']))[0].insertId;
  nl = (await pool.query("INSERT INTO NguyenLieu (ten_nguyen_lieu, don_vi_tinh, so_luong_ton) VALUES ('TEST_HS_NL', 'g', 100)"))[0].insertId;
  await pool.query('INSERT INTO CongThuc (ma_san_pham, ma_nguyen_lieu, dinh_luong) VALUES (?, ?, 20)', [sp, nl]);
});
after(async () => { await donDep(); await pool.end(); });

// ---------- POS-03: thêm dòng ----------
test('thêm dòng: luôn là dòng mới, chụp giá, trừ kho phần ly mới thêm; cùng sản phẩm khác ghi chú là hai dòng', async () => {
  await datTon(100);
  const hd = await taoOrder();
  const r1 = await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/dong`).send({ ma_san_pham: sp, so_luong: 2, ghi_chu: ' ít đá ' });
  assert.equal(r1.status, 201, JSON.stringify(r1.body));
  assert.equal(r1.body.data.chi_tiet.length, 2);
  const moi = r1.body.data.chi_tiet[1];
  assert.deepEqual({ sp: moi.ma_san_pham, sl: moi.so_luong, gia: moi.don_gia, gc: moi.ghi_chu }, { sp, sl: 2, gia: 10000, gc: 'ít đá' });
  assert.equal(r1.body.data.tong_tien_tam_tinh, 45000 + 20000);
  assert.deepEqual(r1.body.data.canh_bao_kho, []);
  assert.equal(await ton(), 60, 'thêm 2 ly -> trừ 40g ngay');

  const r2 = await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/dong`).send({ ma_san_pham: sp, so_luong: 1 });
  assert.equal(r2.body.data.chi_tiet.length, 3, 'cùng sản phẩm vẫn là dòng mới');
  assert.equal(new Set(r2.body.data.chi_tiet.map(c => c.ma_chi_tiet)).size, 3);
  assert.equal(await ton(), 40);
});

test('thêm dòng: thiếu nguyên liệu thì báo đúng phần ly MỚI, order và kho giữ nguyên', async () => {
  await datTon(100);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 4 }]); // trừ 80g, còn 20g
  assert.equal(await ton(), 20);
  const thieu = await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/dong`).send({ ma_san_pham: sp, so_luong: 2 }); // cần 40g > 20g
  assert.equal(thieu.status, 409);
  assert.equal(thieu.body.loi, 'KHONG_DU_NGUYEN_LIEU');
  assert.equal(thieu.body.thong_bao, 'Không đủ nguyên liệu: TEST_HS_NL cần 40 g, còn 20 g (thiếu 20 g)');
  assert.equal(await dem(hd.ma_hoa_don), 1, 'order phải giữ nguyên');
  assert.equal(await ton(), 20, 'báo thiếu thì không trừ gì');
  assert.equal((await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/dong`).send({ ma_san_pham: sp, so_luong: 1 })).status, 201, 'đúng phần còn lại thì được');
  assert.equal(await ton(), 0);
});

test('thêm dòng: kiểm tra đầu vào, sản phẩm và hóa đơn không hợp lệ', async () => {
  const hd = await taoOrder();
  const url = `/api/hoa-don/${hd.ma_hoa_don}/dong`;
  for (const body of [{}, { ma_san_pham: sp, so_luong: 0 }, { ma_san_pham: sp, so_luong: 100 }, { so_luong: 1 }, { ma_san_pham: '7', so_luong: 1 }]) {
    const res = await goi('post', url).send(body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(res.body.loi, 'DU_LIEU_SAI');
  }
  assert.equal((await goi('post', url).send({ ma_san_pham: 99999, so_luong: 1 })).status, 404);
  const ngung = await goi('post', url).send({ ma_san_pham: 8, so_luong: 1 }); // Croissant: ngừng bán
  assert.equal(ngung.status, 400);
  assert.equal(ngung.body.loi, 'SAN_PHAM_NGUNG_BAN');
  assert.equal((await goi('post', '/api/hoa-don/99999/dong').send({ ma_san_pham: 7, so_luong: 1 })).status, 404);
  assert.equal((await goi('post', '/api/hoa-don/abc/dong').send({ ma_san_pham: 7, so_luong: 1 })).status, 400);
  assert.equal(await dem(hd.ma_hoa_don), 1);
});

test('thêm dòng vào order ĐÃ PHỤC VỤ: có món mới cần làm nên quay lại "đang pha chế"', async () => {
  await datTon(100);
  const hd = await taoOrder();
  await goi('patch', `/api/hoa-don/${hd.ma_hoa_don}/trang-thai`).send({ trang_thai_moi: 'da_phuc_vu' });
  const res = await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/dong`).send({ ma_san_pham: sp, so_luong: 1 });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.trang_thai, 'dang_pha_che');
  assert.equal(await ton(), 80);
});

// ---------- POS-04: sửa dòng ----------
test('sửa dòng: đổi ghi chú không đụng kho; tăng số lượng trừ phần chênh; ghi chú null hoặc rỗng là xóa', async () => {
  await datTon(100);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 2, ghi_chu: 'cũ' }]); // trừ 40g -> còn 60
  const url = duongDong(hd);
  assert.equal(await ton(), 60);

  const a = await goi('patch', url).send({ ghi_chu: 'mới' });
  assert.equal(a.status, 200);
  assert.equal(a.body.data.chi_tiet[0].ghi_chu, 'mới');
  assert.equal(a.body.data.chi_tiet[0].so_luong, 2, 'trường không gửi giữ nguyên');
  assert.equal(await ton(), 60, 'đổi ghi chú không đụng kho');

  const b = await goi('patch', url).send({ so_luong: 4 }); // +2 ly = +40g
  assert.equal(b.body.data.chi_tiet[0].so_luong, 4);
  assert.equal(b.body.data.tong_tien_tam_tinh, 40000);
  assert.equal(await ton(), 20, 'tăng 2 ly -> trừ thêm 40g');
  assert.deepEqual(b.body.data.canh_bao_kho, []);

  assert.equal((await goi('patch', url).send({ ghi_chu: null })).body.data.chi_tiet[0].ghi_chu, null);
  await goi('patch', url).send({ ghi_chu: 'x' });
  assert.equal((await goi('patch', url).send({ ghi_chu: '   ' })).body.data.chi_tiet[0].ghi_chu, null, 'rỗng cũng là xóa');
});

test('sửa dòng: tăng quá tồn bị chặn, không đổi gì', async () => {
  await datTon(100);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 4 }]); // còn 20g
  const url = duongDong(hd);
  const qua = await goi('patch', url).send({ so_luong: 6 }); // +2 ly = 40g > 20g
  assert.equal(qua.status, 409);
  assert.equal(qua.body.loi, 'KHONG_DU_NGUYEN_LIEU');
  assert.equal(qua.body.thong_bao, 'Không đủ nguyên liệu: TEST_HS_NL cần 40 g, còn 20 g (thiếu 20 g)');
  assert.equal(await ton(), 20);
  assert.equal((await goi('patch', url).send({ ghi_chu: 'vẫn đổi ghi chú được' })).status, 200);
  assert.equal((await goi('patch', url).send({ so_luong: 5 })).status, 200, 'tăng đúng 1 ly (20g) thì được');
  assert.equal(await ton(), 0);
});

test('sửa dòng: GIẢM số lượng -> ly chưa làm được trả lại, ly đã làm (da_lam) thì không', async () => {
  await datTon(100);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 4 }]); // còn 20g
  const url = duongDong(hd);

  const a = await goi('patch', url).send({ so_luong: 2 }); // bỏ 2 ly, mặc định chưa làm -> trả 40g
  assert.equal(a.status, 200);
  assert.equal(a.body.data.chi_tiet[0].so_luong, 2);
  assert.equal(await ton(), 60);

  const b = await goi('patch', url).send({ so_luong: 1, da_lam: 1 }); // bỏ 1 ly nhưng ly đó ĐÃ làm -> không trả
  assert.equal(b.status, 200);
  assert.equal(await ton(), 60, 'ly đã làm: nguyên liệu vẫn bị trừ');

  await datTon(100);
  const hd2 = await taoOrder([{ ma_san_pham: sp, so_luong: 3 }]); // còn 40g
  const url2 = duongDong(hd2);
  const c = await goi('patch', url2).send({ so_luong: 1, da_lam: 1 }); // bỏ 2 ly, 1 đã làm -> trả 1 ly = 20g
  assert.equal(c.status, 200);
  assert.equal(await ton(), 60);
  assert.equal(c.body.data.chi_tiet[0].so_luong, 1);
});

test('sửa dòng: da_lam sai thì bị từ chối, không đổi gì', async () => {
  await datTon(100);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 3 }]); // còn 40g
  const url = duongDong(hd);
  const nhieu = await goi('patch', url).send({ so_luong: 2, da_lam: 2 }); // chỉ bỏ 1 ly mà đã làm 2
  assert.equal(nhieu.status, 400);
  assert.equal(nhieu.body.loi, 'DU_LIEU_SAI');
  assert.equal((await goi('patch', url).send({ so_luong: 3, da_lam: 1 })).status, 400, 'da_lam chỉ dùng khi giảm số lượng');
  assert.equal((await goi('patch', url).send({ da_lam: 1 })).status, 400);
  assert.equal((await goi('patch', url).send({ so_luong: 5, da_lam: 1 })).status, 400, 'tăng số lượng cũng không dùng da_lam');
  assert.equal((await goi('patch', url).send({ so_luong: 1, da_lam: -1 })).status, 400);
  assert.equal(await ton(), 40, 'bị từ chối thì kho không đổi');
  assert.equal((await goi('patch', url).send({ so_luong: 3 })).status, 200, 'số lượng không đổi: không làm gì cả');
  assert.equal(await ton(), 40);
});

test('sửa dòng: order ĐÃ PHỤC VỤ coi như làm xong hết -> giảm số lượng không trả lại nguyên liệu', async () => {
  await datTon(100);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 4 }]); // còn 20g
  await goi('patch', `/api/hoa-don/${hd.ma_hoa_don}/trang-thai`).send({ trang_thai_moi: 'da_phuc_vu' });
  const res = await goi('patch', duongDong(hd)).send({ so_luong: 2 });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.chi_tiet[0].so_luong, 2);
  assert.equal(await ton(), 20, 'đã phục vụ: không trả');
});

test('sửa dòng: đổi số lượng giữ nguyên mức giảm trên mỗi ly (giam_gia tính lại theo tỷ lệ)', async () => {
  await datTon(100);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 2 }]);
  const ma = hd.chi_tiet[0].ma_chi_tiet;
  await pool.query('UPDATE ChiTietHoaDon SET giam_gia = 2000 WHERE ma_chi_tiet = ?', [ma]); // 1.000đ mỗi ly
  const tang = await goi('patch', `/api/hoa-don/${hd.ma_hoa_don}/dong/${ma}`).send({ so_luong: 4 });
  assert.equal(tang.body.data.chi_tiet[0].giam_gia, 4000);
  assert.equal(tang.body.data.chi_tiet[0].thanh_tien, 4 * 10000 - 4000);
  assert.equal(tang.body.data.tong_tien_tam_tinh, 36000);
  const giam = await goi('patch', `/api/hoa-don/${hd.ma_hoa_don}/dong/${ma}`).send({ so_luong: 1 });
  assert.equal(giam.body.data.chi_tiet[0].giam_gia, 1000);
});

test('sửa dòng: kiểm tra đầu vào; dòng phải thuộc đúng hóa đơn', async () => {
  const a = await taoOrder();
  const b = await taoOrder();
  const dongCuaB = b.chi_tiet[0].ma_chi_tiet;
  assert.equal((await goi('patch', `/api/hoa-don/${a.ma_hoa_don}/dong/${dongCuaB}`).send({ so_luong: 2 })).status, 404, 'dòng của hóa đơn khác');
  const url = duongDong(a);
  assert.equal((await goi('patch', url).send({})).status, 400, 'sửa rỗng');
  assert.equal((await goi('patch', url).send({ so_luong: 0 })).status, 400);
  assert.equal((await goi('patch', url).send({ so_luong: 1.5 })).status, 400);
  assert.equal((await goi('patch', `/api/hoa-don/${a.ma_hoa_don}/dong/99999999`).send({ so_luong: 2 })).status, 404);
});

// ---------- POS-05: xóa dòng ----------
test('xóa dòng: mặc định chưa làm -> trả lại kho; không xóa dòng cuối cùng', async () => {
  await datTon(100);
  const hd = await taoOrder([{ ma_san_pham: spk, so_luong: 1 }, { ma_san_pham: sp, so_luong: 3 }]); // trừ 60g -> còn 40
  assert.equal(await ton(), 40);
  const [d1, d2] = hd.chi_tiet;
  const xoa = await goi('delete', `/api/hoa-don/${hd.ma_hoa_don}/dong/${d2.ma_chi_tiet}`);
  assert.equal(xoa.status, 200, JSON.stringify(xoa.body));
  assert.equal(xoa.body.data.chi_tiet.length, 1);
  assert.equal(xoa.body.data.chi_tiet[0].ma_chi_tiet, d1.ma_chi_tiet);
  assert.equal(await ton(), 100, 'xóa dòng chưa làm -> trả đủ 60g');

  const cuoi = await goi('delete', `/api/hoa-don/${hd.ma_hoa_don}/dong/${d1.ma_chi_tiet}`);
  assert.equal(cuoi.status, 409);
  assert.equal(cuoi.body.loi, 'KHONG_XOA_DONG_CUOI');
  assert.equal(await dem(hd.ma_hoa_don), 1);
  assert.equal((await goi('delete', `/api/hoa-don/${hd.ma_hoa_don}/dong/${d2.ma_chi_tiet}`)).status, 404, 'đã xóa rồi');
});

test('xóa dòng: chọn số ly đã làm (?da_lam=) -> ly đã làm vẫn bị trừ; da_lam vượt số ly bị từ chối', async () => {
  await datTon(100);
  const hd = await taoOrder([{ ma_san_pham: 7, so_luong: 1 }, { ma_san_pham: sp, so_luong: 3 }]); // còn 40g
  const url = duongDong(hd, 1);
  const vuot = await goi('delete', `${url}?da_lam=4`);
  assert.equal(vuot.status, 400);
  assert.equal(await ton(), 40);
  assert.equal(await dem(hd.ma_hoa_don), 2);
  assert.equal((await goi('delete', `${url}?da_lam=abc`)).status, 400);

  const xoa = await goi('delete', `${url}?da_lam=2`); // 3 ly, 2 đã làm -> trả 1 ly = 20g
  assert.equal(xoa.status, 200);
  assert.equal(await ton(), 60);
  assert.equal(await dem(hd.ma_hoa_don), 1);

  await datTon(100);
  const tronVen = await taoOrder([{ ma_san_pham: 7, so_luong: 1 }, { ma_san_pham: sp, so_luong: 2 }]); // còn 60g
  await goi('delete', `${duongDong(tronVen, 1)}?da_lam=2`); // đã làm cả 2 ly -> không trả
  assert.equal(await ton(), 60);
});

test('xóa dòng: order ĐÃ PHỤC VỤ coi như làm xong hết -> không trả lại nguyên liệu', async () => {
  await datTon(100);
  const hd = await taoOrder([{ ma_san_pham: 7, so_luong: 1 }, { ma_san_pham: sp, so_luong: 2 }]); // còn 60g
  await goi('patch', `/api/hoa-don/${hd.ma_hoa_don}/trang-thai`).send({ trang_thai_moi: 'da_phuc_vu' });
  const xoa = await goi('delete', duongDong(hd, 1));
  assert.equal(xoa.status, 200);
  assert.equal(await ton(), 60, 'đã phục vụ: không trả');
});

// ---------- POS-07 / POS-09: trạng thái và hủy ----------
test('đổi trạng thái: chỉ các chuyển hợp lệ; da_lam chỉ dùng khi hủy', async () => {
  const hd = await taoOrder();
  const url = `/api/hoa-don/${hd.ma_hoa_don}/trang-thai`;
  const doi = (tt, them = {}) => goi('patch', url).send({ trang_thai_moi: tt, ...them });

  assert.equal((await doi('dang_pha_che')).body.loi, 'CHUYEN_TRANG_THAI_KHONG_HOP_LE', 'không "chuyển" sang đúng trạng thái hiện tại');
  assert.equal((await doi('da_phuc_vu', { da_lam: [] })).status, 400, 'da_lam chỉ dùng khi hủy');
  const phucVu = await doi('da_phuc_vu');
  assert.equal(phucVu.status, 200);
  assert.equal(phucVu.body.data.trang_thai, 'da_phuc_vu');
  assert.equal((await doi('dang_pha_che')).status, 409, 'không quay ngược');
  const tt = await doi('da_thanh_toan');
  assert.equal(tt.status, 409);
  assert.equal(tt.body.loi, 'CHUYEN_TRANG_THAI_KHONG_HOP_LE');
  assert.match(tt.body.thong_bao, /thanh toán/);
  assert.equal((await doi('huy')).body.data.trang_thai, 'huy', 'đã phục vụ vẫn hủy được');

  assert.equal((await goi('patch', url).send({ trang_thai_moi: 'khac' })).status, 400);
  assert.equal((await goi('patch', url).send({})).status, 400);
  assert.equal((await goi('patch', '/api/hoa-don/99999/trang-thai').send({ trang_thai_moi: 'huy' })).status, 404);
});

test('hủy order: mặc định chưa làm gì -> trả lại toàn bộ nguyên liệu đã trừ', async () => {
  await datTon(100);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 3 }]); // còn 40g
  assert.equal(await ton(), 40);
  const huy = await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/huy`);
  assert.equal(huy.status, 200);
  assert.equal(huy.body.data.trang_thai, 'huy');
  assert.equal(await ton(), 100, 'trả đủ 60g');
  const lan2 = await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/huy`);
  assert.equal(lan2.status, 409);
  assert.equal(lan2.body.loi, 'HOA_DON_DA_DONG');
  assert.equal(await ton(), 100, 'hủy lần 2 không trả thêm');
});

test('hủy order: chọn số ly đã làm theo từng dòng -> chỉ trả phần chưa làm', async () => {
  await datTon(100);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 3, ghi_chu: 'A' }, { ma_san_pham: sp, so_luong: 2, ghi_chu: 'B' }]); // 100g -> còn 0
  assert.equal(await ton(), 0);
  const [A] = hd.chi_tiet;
  // dòng A: 2/3 ly đã làm (trả 1 ly = 20g); dòng B không nêu = chưa làm (trả 2 ly = 40g)
  const huy = await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/huy`).send({ da_lam: [{ ma_chi_tiet: A.ma_chi_tiet, so_luong: 2 }] });
  assert.equal(huy.status, 200, JSON.stringify(huy.body));
  assert.equal(huy.body.data.trang_thai, 'huy');
  assert.equal(await ton(), 60, '20g + 40g');

  // hủy qua PATCH trang-thai cũng cùng luật: dòng A đã làm hết 3, dòng B đã làm 1/2
  await datTon(100);
  const hd2 = await taoOrder([{ ma_san_pham: sp, so_luong: 3 }, { ma_san_pham: sp, so_luong: 2 }]); // còn 0
  const huy2 = await goi('patch', `/api/hoa-don/${hd2.ma_hoa_don}/trang-thai`).send({
    trang_thai_moi: 'huy', da_lam: [{ ma_chi_tiet: hd2.chi_tiet[0].ma_chi_tiet, so_luong: 3 }, { ma_chi_tiet: hd2.chi_tiet[1].ma_chi_tiet, so_luong: 1 }] });
  assert.equal(huy2.status, 200);
  assert.equal(await ton(), 20, 'chỉ trả 1 ly của dòng B');
});

test('hủy order: da_lam sai thì bị từ chối, order vẫn mở và kho giữ nguyên', async () => {
  await datTon(100);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 3 }]); // còn 40g
  const ma = hd.chi_tiet[0].ma_chi_tiet;
  const url = `/api/hoa-don/${hd.ma_hoa_don}/huy`;
  for (const da_lam of [
    [{ ma_chi_tiet: ma, so_luong: 4 }],                                         // vượt số ly đã gọi
    [{ ma_chi_tiet: ma, so_luong: 1 }, { ma_chi_tiet: ma, so_luong: 1 }],       // lặp dòng
    [{ ma_chi_tiet: 99999999, so_luong: 1 }],                                   // dòng không thuộc hóa đơn
    [{ ma_chi_tiet: ma, so_luong: -1 }],                                        // âm
    'abc',                                                                      // sai kiểu
  ]) {
    const res = await goi('post', url).send({ da_lam });
    assert.equal(res.status, 400, JSON.stringify(da_lam));
    assert.equal(res.body.loi, 'DU_LIEU_SAI');
  }
  assert.equal(await trangThai(hd.ma_hoa_don), 'dang_pha_che');
  assert.equal(await ton(), 40);
});

test('hủy order ĐÃ PHỤC VỤ: coi như làm xong hết, không trả lại nguyên liệu', async () => {
  await datTon(100);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 2 }]); // còn 60g
  await goi('patch', `/api/hoa-don/${hd.ma_hoa_don}/trang-thai`).send({ trang_thai_moi: 'da_phuc_vu' });
  const huy = await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/huy`);
  assert.equal(huy.status, 200);
  assert.equal(huy.body.data.trang_thai, 'huy');
  assert.equal(await ton(), 60, 'đã phục vụ rồi hủy: nguyên liệu đã dùng, giữ nguyên số đã trừ');
});

test('hủy order: không hủy được hóa đơn đã thanh toán, kho không đổi; hóa đơn không tồn tại -> 404', async () => {
  await datTon(100);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 1 }]); // còn 80g
  await pool.query("UPDATE HoaDon SET trang_thai = 'da_thanh_toan' WHERE ma_hoa_don = ?", [hd.ma_hoa_don]);
  const res = await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/huy`);
  assert.equal(res.status, 409);
  assert.equal(res.body.loi, 'HOA_DON_DA_DONG');
  assert.equal(await ton(), 80);
  assert.equal((await goi('post', '/api/hoa-don/99999/huy')).status, 404);
});

test('hóa đơn đã thanh toán hoặc đã hủy: mọi thao tác sửa đều bị chặn, dữ liệu và kho giữ nguyên', async () => {
  for (const tt of ['da_thanh_toan', 'huy']) {
    await datTon(100);
    const hd = await taoOrder([{ ma_san_pham: 7, so_luong: 1 }, { ma_san_pham: spk, so_luong: 1 }]);
    await pool.query('UPDATE HoaDon SET trang_thai = ? WHERE ma_hoa_don = ?', [tt, hd.ma_hoa_don]);
    const ma = hd.ma_hoa_don;
    const d = hd.chi_tiet[0].ma_chi_tiet;
    const kq = await Promise.all([
      goi('post', `/api/hoa-don/${ma}/dong`).send({ ma_san_pham: sp, so_luong: 1 }),
      goi('patch', `/api/hoa-don/${ma}/dong/${d}`).send({ so_luong: 5 }),
      goi('delete', `/api/hoa-don/${ma}/dong/${d}`),
      goi('patch', `/api/hoa-don/${ma}/trang-thai`).send({ trang_thai_moi: 'huy' }),
    ]);
    for (const r of kq) {
      assert.equal(r.status, 409, tt);
      assert.equal(r.body.loi, 'HOA_DON_DA_DONG');
    }
    assert.equal(await dem(ma), 2, 'số dòng không đổi');
    assert.equal(await ton(), 100, 'kho không đổi');
  }
});

// ---------- Đồng thời & quyền ----------
test('4 yêu cầu thêm dòng cùng lúc: được xử lý nối tiếp, kho chỉ đủ cho đúng 2 yêu cầu, tồn không âm', async () => {
  await datTon(100); // mỗi yêu cầu thêm 2 ly (40g) -> đúng 2 yêu cầu thành công
  const hd = await taoOrder();
  const kq = await Promise.all(Array.from({ length: 4 }, () => goi('post', `/api/hoa-don/${hd.ma_hoa_don}/dong`).send({ ma_san_pham: sp, so_luong: 2 })));
  assert.equal(kq.filter(r => r.status === 201).length, 2, kq.map(r => r.status).join(','));
  assert.equal(kq.filter(r => r.status === 409 && r.body.loi === 'KHONG_DU_NGUYEN_LIEU').length, 2);
  assert.equal(await dem(hd.ma_hoa_don), 1 + 2);
  assert.equal(await ton(), 20, '100 - 2 x 40');
});

test('3 yêu cầu hủy cùng lúc: chỉ một lần có hiệu lực, nguyên liệu chỉ được trả MỘT lần', async () => {
  await datTon(100);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 2 }]); // còn 60g
  const kq = await Promise.all([1, 2, 3].map(() => goi('post', `/api/hoa-don/${hd.ma_hoa_don}/huy`)));
  assert.equal(kq.filter(r => r.status === 200).length, 1, kq.map(r => r.status).join(','));
  assert.equal(kq.filter(r => r.status === 409 && r.body.loi === 'HOA_DON_DA_DONG').length, 2);
  assert.equal(await ton(), 100, 'trả đúng 40g một lần (không phải 3 lần)');
});

test('thêm món và hủy cùng lúc trên một order: kho luôn khớp với kết quả cuối cùng', async () => {
  await datTon(100);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 1 }]); // còn 80g
  const [them, huy] = await Promise.all([
    goi('post', `/api/hoa-don/${hd.ma_hoa_don}/dong`).send({ ma_san_pham: sp, so_luong: 2 }),
    goi('post', `/api/hoa-don/${hd.ma_hoa_don}/huy`),
  ]);
  assert.equal(huy.status, 200);
  assert.ok([201, 409].includes(them.status));
  // Thêm kịp trước khi hủy: +2 ly bị trừ rồi hủy trả lại tất cả (1+2 ly) = 100g. Thêm sau khi đã hủy: bị chặn, hủy trả 1 ly = 100g.
  assert.equal(await ton(), 100, `them=${them.status}: sau khi hủy mọi ly chưa làm đều phải về kho`);
});

test('quản lý và admin cũng sửa được; chưa đăng nhập thì 401 ở mọi thao tác', async () => {
  await datTon(100);
  const hd = await taoOrder();
  const d = hd.chi_tiet[0].ma_chi_tiet;
  assert.equal((await goi('patch', `/api/hoa-don/${hd.ma_hoa_don}/dong/${d}`, 'quanly').send({ ghi_chu: 'q' })).status, 200);
  assert.equal((await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/dong`, 'admin').send({ ma_san_pham: 7, so_luong: 1 })).status, 201);
  for (const [pt, duong] of [['post', `/api/hoa-don/${hd.ma_hoa_don}/dong`], ['patch', `/api/hoa-don/${hd.ma_hoa_don}/dong/${d}`],
    ['delete', `/api/hoa-don/${hd.ma_hoa_don}/dong/${d}`], ['patch', `/api/hoa-don/${hd.ma_hoa_don}/trang-thai`], ['post', `/api/hoa-don/${hd.ma_hoa_don}/huy`]]) {
    assert.equal((await goi(pt, duong, null).send({})).status, 401, `${pt} ${duong}`);
  }
});
