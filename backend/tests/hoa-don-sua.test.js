// Test chỉnh sửa order: POS-03 (thêm dòng), POS-04 (sửa dòng), POS-05 (xóa dòng), POS-07 (đổi trạng thái), POS-09 (hủy).
// Dữ liệu riêng TEST_HS_*: 1 sản phẩm (10.000đ), 1 nguyên liệu tồn 100g, công thức 20g/ly -> tối đa 5 ly.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'khoa-chi-dung-cho-test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const pool = require('../src/config/db');
const { taoApp } = require('../src/app');

const app = taoApp();
const token = {};
const taoRa = [];
let sp; let nl;

const goi = (pt, duong, ten = 'nhanvien') => {
  const r = request(app)[pt](duong);
  return ten ? r.set('Authorization', `Bearer ${token[ten]}`) : r;
};
const datTon = n => pool.query('UPDATE NguyenLieu SET so_luong_ton = ? WHERE ma_nguyen_lieu = ?', [n, nl]);
const tonHienTai = async () => (await pool.query('SELECT so_luong_ton FROM NguyenLieu WHERE ma_nguyen_lieu = ?', [nl]))[0][0].so_luong_ton;
const dem = async ma => (await pool.query('SELECT COUNT(*) AS n FROM ChiTietHoaDon WHERE ma_hoa_don = ?', [ma]))[0][0].n;

// Tạo order qua API; mặc định 1 dòng Bánh tiramisu (sản phẩm mẫu số 7, không có công thức nên không giới hạn kho)
async function taoOrder(items = [{ ma_san_pham: 7, so_luong: 1 }]) {
  const res = await goi('post', '/api/hoa-don').send({ items });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  taoRa.push(res.body.data.ma_hoa_don);
  return res.body.data;
}

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
  nl = (await pool.query("INSERT INTO NguyenLieu (ten_nguyen_lieu, don_vi_tinh, so_luong_ton) VALUES ('TEST_HS_NL', 'g', 100)"))[0].insertId;
  await pool.query('INSERT INTO CongThuc (ma_san_pham, ma_nguyen_lieu, dinh_luong) VALUES (?, ?, 20)', [sp, nl]);
});
after(async () => { await donDep(); await pool.end(); });

// ---------- POS-03: thêm dòng ----------
test('thêm dòng: luôn là dòng mới, chụp giá, cập nhật tạm tính; cùng sản phẩm khác ghi chú là hai dòng', async () => {
  await datTon(100);
  const hd = await taoOrder();
  const r1 = await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/dong`).send({ ma_san_pham: sp, so_luong: 2, ghi_chu: ' ít đá ' });
  assert.equal(r1.status, 201, JSON.stringify(r1.body));
  assert.equal(r1.body.data.chi_tiet.length, 2);
  const moi = r1.body.data.chi_tiet[1];
  assert.deepEqual({ sp: moi.ma_san_pham, sl: moi.so_luong, gia: moi.don_gia, gc: moi.ghi_chu }, { sp, sl: 2, gia: 10000, gc: 'ít đá' });
  assert.equal(r1.body.data.tong_tien_tam_tinh, 45000 + 20000);

  const r2 = await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/dong`).send({ ma_san_pham: sp, so_luong: 1 });
  assert.equal(r2.body.data.chi_tiet.length, 3, 'cùng sản phẩm vẫn là dòng mới');
  assert.equal(new Set(r2.body.data.chi_tiet.map(c => c.ma_chi_tiet)).size, 3);
});

test('thêm dòng: kiểm tra nguyên liệu gộp mọi dòng trong order; không đủ thì order giữ nguyên', async () => {
  await datTon(100); // tối đa 5 ly
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 4 }]); // 80g
  const loiThieu = await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/dong`).send({ ma_san_pham: sp, so_luong: 2 }); // tổng 6 ly = 120g > 100g
  assert.equal(loiThieu.status, 409);
  assert.equal(loiThieu.body.loi, 'KHONG_DU_NGUYEN_LIEU');
  assert.equal(loiThieu.body.thong_bao, 'Không đủ nguyên liệu: TEST_HS_NL cần 120 g, còn 100 g (thiếu 20 g)');
  assert.equal(await dem(hd.ma_hoa_don), 1, 'order phải giữ nguyên');
  assert.equal((await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/dong`).send({ ma_san_pham: sp, so_luong: 1 })).status, 201, 'đúng 5 ly thì được');
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

// ---------- POS-04: sửa dòng ----------
test('sửa dòng: đổi ghi chú / số lượng; ghi chú null hoặc rỗng là xóa ghi chú', async () => {
  await datTon(100);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 2, ghi_chu: 'cũ' }]);
  const url = `/api/hoa-don/${hd.ma_hoa_don}/dong/${hd.chi_tiet[0].ma_chi_tiet}`;

  const a = await goi('patch', url).send({ ghi_chu: 'mới' });
  assert.equal(a.status, 200);
  assert.equal(a.body.data.chi_tiet[0].ghi_chu, 'mới');
  assert.equal(a.body.data.chi_tiet[0].so_luong, 2, 'trường không gửi giữ nguyên');

  const b = await goi('patch', url).send({ so_luong: 4 });
  assert.equal(b.body.data.chi_tiet[0].so_luong, 4);
  assert.equal(b.body.data.tong_tien_tam_tinh, 40000);

  assert.equal((await goi('patch', url).send({ ghi_chu: null })).body.data.chi_tiet[0].ghi_chu, null);
  await goi('patch', url).send({ ghi_chu: 'x' });
  assert.equal((await goi('patch', url).send({ ghi_chu: '   ' })).body.data.chi_tiet[0].ghi_chu, null, 'rỗng cũng là xóa');
});

test('sửa dòng: tăng quá tồn bị chặn, giảm số lượng luôn được phép kể cả khi kho đã thấp', async () => {
  await datTon(100);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 4 }]);
  const url = `/api/hoa-don/${hd.ma_hoa_don}/dong/${hd.chi_tiet[0].ma_chi_tiet}`;
  const qua = await goi('patch', url).send({ so_luong: 6 }); // 120g > 100g
  assert.equal(qua.status, 409);
  assert.equal(qua.body.loi, 'KHONG_DU_NGUYEN_LIEU');
  assert.equal((await goi('patch', url).send({ so_luong: 5 })).status, 200, 'đúng 5 ly thì được');

  await datTon(10); // kho tụt thấp: order đang cần 100g nhưng chỉ còn 10g
  const giam = await goi('patch', url).send({ so_luong: 3 });
  assert.equal(giam.status, 200, 'giảm số lượng không bị kiểm tra kho');
  assert.equal(giam.body.data.chi_tiet[0].so_luong, 3);
  assert.equal((await goi('patch', url).send({ so_luong: 4 })).status, 409, 'tăng lại thì bị chặn');
  assert.equal((await goi('patch', url).send({ ghi_chu: 'chỉ đổi ghi chú' })).status, 200, 'đổi ghi chú không bị kiểm tra kho');
  await datTon(100);
});

test('sửa dòng: đổi số lượng giữ nguyên mức giảm trên mỗi ly (giam_gia tính lại theo tỷ lệ)', async () => {
  await datTon(100);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 2 }]);
  const ma = hd.chi_tiet[0].ma_chi_tiet;
  await pool.query('UPDATE ChiTietHoaDon SET giam_gia = 2000 WHERE ma_chi_tiet = ?', [ma]); // 1.000đ mỗi ly
  const res = await goi('patch', `/api/hoa-don/${hd.ma_hoa_don}/dong/${ma}`).send({ so_luong: 4 });
  assert.equal(res.body.data.chi_tiet[0].giam_gia, 4000);
  assert.equal(res.body.data.chi_tiet[0].thanh_tien, 4 * 10000 - 4000);
  assert.equal(res.body.data.tong_tien_tam_tinh, 36000);
});

test('sửa dòng: kiểm tra đầu vào; dòng phải thuộc đúng hóa đơn', async () => {
  const a = await taoOrder();
  const b = await taoOrder();
  const dongCuaB = b.chi_tiet[0].ma_chi_tiet;
  assert.equal((await goi('patch', `/api/hoa-don/${a.ma_hoa_don}/dong/${dongCuaB}`).send({ so_luong: 2 })).status, 404, 'dòng của hóa đơn khác');
  const url = `/api/hoa-don/${a.ma_hoa_don}/dong/${a.chi_tiet[0].ma_chi_tiet}`;
  assert.equal((await goi('patch', url).send({})).status, 400, 'sửa rỗng');
  assert.equal((await goi('patch', url).send({ so_luong: 0 })).status, 400);
  assert.equal((await goi('patch', url).send({ so_luong: 1.5 })).status, 400);
  assert.equal((await goi('patch', `/api/hoa-don/${a.ma_hoa_don}/dong/99999999`).send({ so_luong: 2 })).status, 404);
});

// ---------- POS-05: xóa dòng ----------
test('xóa dòng: xóa được, nhưng không xóa dòng cuối cùng', async () => {
  const hd = await taoOrder([{ ma_san_pham: 7, so_luong: 1 }, { ma_san_pham: 1, so_luong: 1 }]);
  const [d1, d2] = hd.chi_tiet;
  const xoa = await goi('delete', `/api/hoa-don/${hd.ma_hoa_don}/dong/${d1.ma_chi_tiet}`);
  assert.equal(xoa.status, 200);
  assert.equal(xoa.body.data.chi_tiet.length, 1);
  assert.equal(xoa.body.data.chi_tiet[0].ma_chi_tiet, d2.ma_chi_tiet);

  const cuoi = await goi('delete', `/api/hoa-don/${hd.ma_hoa_don}/dong/${d2.ma_chi_tiet}`);
  assert.equal(cuoi.status, 409);
  assert.equal(cuoi.body.loi, 'KHONG_XOA_DONG_CUOI');
  assert.equal(await dem(hd.ma_hoa_don), 1);

  assert.equal((await goi('delete', `/api/hoa-don/${hd.ma_hoa_don}/dong/${d1.ma_chi_tiet}`)).status, 404, 'đã xóa rồi');
});

// ---------- POS-07 / POS-09: trạng thái và hủy ----------
test('đổi trạng thái: chỉ các chuyển hợp lệ', async () => {
  const hd = await taoOrder();
  const url = `/api/hoa-don/${hd.ma_hoa_don}/trang-thai`;
  const doi = tt => goi('patch', url).send({ trang_thai_moi: tt });

  assert.equal((await doi('dang_pha_che')).body.loi, 'CHUYEN_TRANG_THAI_KHONG_HOP_LE', 'không "chuyển" sang đúng trạng thái hiện tại');
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

test('hủy order: hủy được khi chưa thanh toán, không trừ kho, không hủy hai lần', async () => {
  await datTon(100);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 3 }]);
  const huy = await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/huy`);
  assert.equal(huy.status, 200);
  assert.equal(huy.body.data.trang_thai, 'huy');
  assert.equal(await tonHienTai(), 100, 'hủy không được đụng tới kho');
  const lan2 = await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/huy`);
  assert.equal(lan2.status, 409);
  assert.equal(lan2.body.loi, 'HOA_DON_DA_DONG');

  const daTra = await taoOrder();
  await pool.query("UPDATE HoaDon SET trang_thai = 'da_thanh_toan' WHERE ma_hoa_don = ?", [daTra.ma_hoa_don]);
  const khongHuy = await goi('post', `/api/hoa-don/${daTra.ma_hoa_don}/huy`);
  assert.equal(khongHuy.status, 409);
  assert.equal(khongHuy.body.loi, 'HOA_DON_DA_DONG');
  assert.equal((await goi('post', '/api/hoa-don/99999/huy')).status, 404);
});

test('hóa đơn đã thanh toán hoặc đã hủy: mọi thao tác sửa đều bị chặn, dữ liệu giữ nguyên', async () => {
  for (const trangThai of ['da_thanh_toan', 'huy']) {
    const hd = await taoOrder([{ ma_san_pham: 7, so_luong: 1 }, { ma_san_pham: 1, so_luong: 1 }]);
    await pool.query('UPDATE HoaDon SET trang_thai = ? WHERE ma_hoa_don = ?', [trangThai, hd.ma_hoa_don]);
    const ma = hd.ma_hoa_don;
    const d = hd.chi_tiet[0].ma_chi_tiet;
    const kq = await Promise.all([
      goi('post', `/api/hoa-don/${ma}/dong`).send({ ma_san_pham: 7, so_luong: 1 }),
      goi('patch', `/api/hoa-don/${ma}/dong/${d}`).send({ so_luong: 5 }),
      goi('delete', `/api/hoa-don/${ma}/dong/${d}`),
      goi('patch', `/api/hoa-don/${ma}/trang-thai`).send({ trang_thai_moi: 'huy' }),
    ]);
    for (const r of kq) {
      assert.equal(r.status, 409, trangThai);
      assert.equal(r.body.loi, 'HOA_DON_DA_DONG');
    }
    assert.equal(await dem(ma), 2, 'số dòng không đổi');
  }
});

// ---------- Đồng thời & quyền ----------
test('4 yêu cầu thêm dòng cùng lúc trên một order: được xử lý nối tiếp, kho chỉ đủ cho đúng 2 yêu cầu', async () => {
  await datTon(100); // 5 ly; mỗi yêu cầu thêm 2 ly -> đúng 2 yêu cầu thành công
  const hd = await taoOrder();
  const kq = await Promise.all(Array.from({ length: 4 }, () => goi('post', `/api/hoa-don/${hd.ma_hoa_don}/dong`).send({ ma_san_pham: sp, so_luong: 2 })));
  const thanhCong = kq.filter(r => r.status === 201).length;
  const thieu = kq.filter(r => r.status === 409 && r.body.loi === 'KHONG_DU_NGUYEN_LIEU').length;
  assert.equal(thanhCong, 2, kq.map(r => r.status).join(','));
  assert.equal(thieu, 2);
  assert.equal(await dem(hd.ma_hoa_don), 1 + 2);
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
