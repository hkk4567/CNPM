// Test 7a – module khuyen-mai: KM-01..KM-06 (+ xem chi tiết). Dữ liệu riêng TEST_KM_*: danh mục TEST_KM_DM, sản phẩm TEST_KM_SP1/SP2 (không công thức,
// nên không đụng kho), khuyến mãi TEST_KM_*. KHÔNG đụng 3 khuyến mãi mẫu (mã 1..3): test khác dùng chúng.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'khoa-chi-dung-cho-test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const pool = require('../src/config/db');
const { taoApp } = require('../src/app');

const app = taoApp();
const token = {};
const hoaDonTao = [];
let sp1; let sp2; let maDm; let dem = 0;

const goi = (pt, duong, ten = 'quanly') => {
  const r = request(app)[pt](duong);
  return ten ? r.set('Authorization', `Bearer ${token[ten]}`) : r;
};
// Thời điểm tương đối so với bây giờ (giờ địa phương, dạng ISO có múi giờ để không lệch)
const luc = (ngay, gio = 0) => new Date(Date.now() + (ngay * 24 + gio) * 3600 * 1000).toISOString();
const moi = (ghiDe = {}) => ({
  ten_khuyen_mai: `TEST_KM_${Date.now()}_${dem++}`, loai_giam: 'phan_tram', gia_tri_giam: 10,
  ngay_bat_dau: luc(-1), ngay_ket_thuc: luc(30), ...ghiDe,
});
async function taoKM(ghiDe) {
  const res = await goi('post', '/api/khuyen-mai').send(moi(ghiDe));
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data;
}
const demTheoTen = async ten => (await pool.query('SELECT COUNT(*) AS n FROM KhuyenMai WHERE ten_khuyen_mai = ?', [ten]))[0][0].n;
const laySp = async ma => (await goi('get', `/api/khuyen-mai/${ma}`)).body.data.san_pham.map(s => s.ma_san_pham);

// Tạo một order mà khuyến mãi `maKm` được TỰ ÁP (7b): dùng sản phẩm mới (29.000đ) chỉ thuộc khuyến mãi này, nên mức giảm
// = đúng khuyến mãi (mặc định 10% = 2.900đ mỗi ly) và không bị các khuyến mãi TEST_KM khác của test này cộng dồn vào.
let demSp = 0;
async function taoDongDaDung(maKm, soLy = 2, mucMoiLy = 2900) {
  const [r] = await pool.query('INSERT INTO SanPham (ma_danh_muc, ten_san_pham, gia_ban) VALUES (?, ?, 29000)', [maDm, `TEST_KM_SPD_${Date.now()}_${demSp++}`]);
  assert.equal((await goi('post', `/api/khuyen-mai/${maKm}/san-pham`).send({ ma_san_pham: [r.insertId] })).status, 200);
  const res = await goi('post', '/api/hoa-don', 'nhanvien').send({ items: [{ ma_san_pham: r.insertId, so_luong: soLy }] });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  hoaDonTao.push(res.body.data.ma_hoa_don);
  const dong = res.body.data.chi_tiet[0];
  assert.equal(dong.giam_gia, soLy * mucMoiLy, 'mức giảm được tự áp khi gọi món');
  assert.deepEqual(dong.khuyen_mai.map(k => [k.ma_khuyen_mai, k.muc_giam_moi_ly]), [[maKm, mucMoiLy]]);
  return { ma_hoa_don: res.body.data.ma_hoa_don, ma_chi_tiet: dong.ma_chi_tiet };
}

async function donDep() {
  const [rows] = await pool.query(`SELECT DISTINCT c.ma_hoa_don FROM ChiTietHoaDon c JOIN SanPham s ON s.ma_san_pham = c.ma_san_pham WHERE s.ten_san_pham LIKE 'TEST\\_KM\\_%'`);
  const ids = [...new Set([...hoaDonTao, ...rows.map(r => r.ma_hoa_don)])];
  if (ids.length) {
    await pool.query('DELETE FROM ChiTietHoaDon WHERE ma_hoa_don IN (?)', [ids]); // ChiTietHoaDonKhuyenMai xóa theo (CASCADE)
    await pool.query('DELETE FROM HoaDon WHERE ma_hoa_don IN (?)', [ids]);
  }
  await pool.query("DELETE kmsp FROM KhuyenMaiSanPham kmsp JOIN KhuyenMai km ON km.ma_khuyen_mai = kmsp.ma_khuyen_mai WHERE km.ten_khuyen_mai LIKE 'TEST\\_KM\\_%'");
  await pool.query("DELETE FROM KhuyenMai WHERE ten_khuyen_mai LIKE 'TEST\\_KM\\_%'");
  await pool.query("DELETE FROM SanPham WHERE ten_san_pham LIKE 'TEST\\_KM\\_%'");
  await pool.query("DELETE FROM DanhMuc WHERE ten_danh_muc LIKE 'TEST\\_KM\\_%'");
  hoaDonTao.length = 0;
}

before(async () => {
  await donDep();
  for (const [ten, mk] of [['admin', 'Admin@123'], ['quanly', 'Quanly@123'], ['nhanvien', 'Nhanvien@123']]) {
    const res = await request(app).post('/api/auth/dang-nhap').send({ ten_dang_nhap: ten, mat_khau: mk });
    token[ten] = res.body.data.token;
  }
  const [dm] = await pool.query("INSERT INTO DanhMuc (ten_danh_muc) VALUES ('TEST_KM_DM')");
  maDm = dm.insertId;
  sp1 = (await pool.query("INSERT INTO SanPham (ma_danh_muc, ten_san_pham, gia_ban) VALUES (?, 'TEST_KM_SP1', 29000)", [dm.insertId]))[0].insertId;
  sp2 = (await pool.query("INSERT INTO SanPham (ma_danh_muc, ten_san_pham, gia_ban, trang_thai) VALUES (?, 'TEST_KM_SP2', 35000, 'ngung_ban')", [dm.insertId]))[0].insertId;
});
after(async () => {
  await donDep();
  await pool.end();
});

// ---------- KM-01 ----------
test('KM-01: tạo khuyến mãi kèm sản phẩm (kể cả sản phẩm ngừng bán); admin và quản lý đều tạo được', async () => {
  const m = moi({ gia_tri_giam: 15 });
  const res = await goi('post', '/api/khuyen-mai', 'admin').send({ ...m, ma_san_pham: [sp1, sp2, sp1] });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const d = res.body.data;
  assert.equal(d.ten_khuyen_mai, m.ten_khuyen_mai);
  assert.equal(d.loai_giam, 'phan_tram');
  assert.equal(d.gia_tri_giam, 15);
  assert.equal(d.trang_thai, 'dang_chay');
  assert.equal(d.so_san_pham, 2, 'mã trùng trong mảng chỉ tính một lần');
  assert.equal(d.so_luot_dung, 0);
  assert.deepEqual(d.san_pham.map(s => s.ma_san_pham), [sp1, sp2]);
  const khongSp = await goi('post', '/api/khuyen-mai', 'quanly').send(moi({ loai_giam: 'so_tien', gia_tri_giam: 5000 }));
  assert.equal(khongSp.status, 201);
  assert.deepEqual(khongSp.body.data.san_pham, []);
  assert.equal(khongSp.body.data.so_san_pham, 0);
});

test('KM-01: nhân viên 403, chưa đăng nhập 401, không tạo gì', async () => {
  const m = moi();
  assert.equal((await goi('post', '/api/khuyen-mai', 'nhanvien').send(m)).status, 403);
  assert.equal((await goi('post', '/api/khuyen-mai', null).send(m)).status, 401);
  assert.equal(await demTheoTen(m.ten_khuyen_mai), 0);
});

test('KM-01: đầu vào sai -> 400 và không tạo gì (phần trăm > 100, số tiền <= 0, ngày ngược, định dạng ngày, trường lạ...)', async () => {
  const cacCa = [
    { gia_tri_giam: 150 }, { gia_tri_giam: 100.5 }, { gia_tri_giam: 0 }, { gia_tri_giam: -5 }, { gia_tri_giam: '10' },
    { loai_giam: 'so_tien', gia_tri_giam: 0 }, { loai_giam: 'so_tien', gia_tri_giam: -1000 }, { loai_giam: 'khac' },
    { ngay_bat_dau: luc(5), ngay_ket_thuc: luc(1) }, { ngay_bat_dau: '2026-10-20T08:00:00', ngay_ket_thuc: '2026-10-20T08:00:00' },
    { ngay_bat_dau: '2026-10-20' }, { ngay_bat_dau: 'hom nay' }, { ngay_ket_thuc: '2026-13-45T00:00:00' }, { ngay_bat_dau: undefined },
    { ten_khuyen_mai: '   ' }, { ten_khuyen_mai: 'x'.repeat(151) },
    { diem: 5 }, { ma_san_pham: 5 }, { ma_san_pham: [-1] }, { ma_san_pham: [1.5] }, { ma_san_pham: ['a'] },
  ];
  for (const c of cacCa) {
    const body = moi(c);
    if (c.ten_khuyen_mai === undefined) body.ten_khuyen_mai = `TEST_KM_sai_${dem++}`;
    const res = await goi('post', '/api/khuyen-mai').send(body);
    assert.equal(res.status, 400, JSON.stringify(c));
    assert.equal(res.body.loi, 'DU_LIEU_SAI');
  }
  assert.equal((await pool.query("SELECT COUNT(*) AS n FROM KhuyenMai WHERE ten_khuyen_mai LIKE 'TEST\\_KM\\_sai\\_%'"))[0][0].n, 0);
  const m = moi(); delete m.loai_giam;
  assert.equal((await goi('post', '/api/khuyen-mai').send(m)).status, 400, 'thiếu trường bắt buộc');
});

test('KM-01: phần trăm đúng 100 và nhận ngày có múi giờ / dạng "YYYY-MM-DD HH:mm"; sản phẩm không tồn tại -> 404 và không tạo gì', async () => {
  const ok100 = await goi('post', '/api/khuyen-mai').send(moi({ gia_tri_giam: 100, ngay_bat_dau: '2030-01-01 08:00', ngay_ket_thuc: '2030-01-02T08:00:00+07:00' }));
  assert.equal(ok100.status, 201, JSON.stringify(ok100.body));
  assert.equal(ok100.body.data.trang_thai, 'sap_dien_ra');
  const m = moi();
  const res = await goi('post', '/api/khuyen-mai').send({ ...m, ma_san_pham: [sp1, 999999991, 999999992] });
  assert.equal(res.status, 404);
  assert.match(res.body.thong_bao, /999999991, 999999992/);
  assert.equal(await demTheoTen(m.ten_khuyen_mai), 0, 'transaction: lỗi ở sản phẩm thì không tạo khuyến mãi');
});

// ---------- KM-06 (+ chi tiết) ----------
test('KM-06: trạng thái suy ra từ ngày; lọc theo trạng thái và theo sản phẩm; nhiều khuyến mãi cùng một sản phẩm', async () => {
  const sap = await taoKM({ ngay_bat_dau: luc(2), ngay_ket_thuc: luc(5), ma_san_pham: [sp1] });
  const chay = await taoKM({ ma_san_pham: [sp1] });
  const het = await taoKM({ ngay_bat_dau: luc(-5), ngay_ket_thuc: luc(-2), ma_san_pham: [sp1] });
  assert.deepEqual([sap.trang_thai, chay.trang_thai, het.trang_thai], ['sap_dien_ra', 'dang_chay', 'het_han']);

  const theoSp = await goi('get', `/api/khuyen-mai?ma_san_pham=${sp1}&moi_trang=100`);
  assert.equal(theoSp.status, 200);
  const ma = theoSp.body.data.map(k => k.ma_khuyen_mai);
  for (const k of [sap, chay, het]) assert.ok(ma.includes(k.ma_khuyen_mai), 'một sản phẩm thuộc nhiều khuyến mãi cùng lúc');
  assert.ok(theoSp.body.data.every(k => typeof k.so_san_pham === 'number' && typeof k.so_luot_dung === 'number'));
  assert.equal(theoSp.body.tong_so_ban_ghi, ma.length);

  for (const [tt, dung, sai] of [['sap_dien_ra', sap, [chay, het]], ['dang_chay', chay, [sap, het]], ['het_han', het, [sap, chay]]]) {
    const r = await goi('get', `/api/khuyen-mai?trang_thai=${tt}&ma_san_pham=${sp1}&moi_trang=100`);
    const m = r.body.data.map(k => k.ma_khuyen_mai);
    assert.ok(m.includes(dung.ma_khuyen_mai), tt);
    for (const k of sai) assert.ok(!m.includes(k.ma_khuyen_mai), tt);
    assert.ok(r.body.data.every(k => k.trang_thai === tt));
  }
  const khac = await goi('get', `/api/khuyen-mai?ma_san_pham=${sp2}&moi_trang=100`);
  assert.ok(!khac.body.data.some(k => k.ma_khuyen_mai === chay.ma_khuyen_mai));
});

test('KM-06: phân trang; quyền; đầu vào sai; chi tiết 404', async () => {
  // Phân trang trên tập RIÊNG (sản phẩm mới + 3 khuyến mãi của test này): bảng KhuyenMai dùng chung với file test khác chạy song song
  const [r] = await pool.query('INSERT INTO SanPham (ma_danh_muc, ten_san_pham, gia_ban) VALUES (?, ?, 29000)', [maDm, `TEST_KM_SPD_${Date.now()}_${demSp++}`]);
  const spp = r.insertId;
  const tao = [await taoKM({ ma_san_pham: [spp] }), await taoKM({ ma_san_pham: [spp] }), await taoKM({ ma_san_pham: [spp] })];
  const url = t => `/api/khuyen-mai?ma_san_pham=${spp}&moi_trang=1&trang=${t}`;
  const [t1, t2, t3, t4] = [await goi('get', url(1)), await goi('get', url(2)), await goi('get', url(3)), await goi('get', url(4))];
  for (const t of [t1, t2, t3]) assert.equal(t.body.data.length, 1);
  assert.equal(t4.body.data.length, 0);
  assert.equal(t1.body.tong_so_ban_ghi, 3);
  // sắp xếp mới nhất (mã lớn) trước
  assert.deepEqual([t1, t2, t3].map(t => t.body.data[0].ma_khuyen_mai), tao.map(k => k.ma_khuyen_mai).reverse());
  assert.equal((await goi('get', '/api/khuyen-mai', 'nhanvien')).status, 403);
  for (const q of ['?trang_thai=abc', '?ma_san_pham=0', '?ma_san_pham=x', '?moi_trang=0', '?moi_trang=101']) {
    assert.equal((await goi('get', `/api/khuyen-mai${q}`)).status, 400, q);
  }
  assert.equal((await goi('get', '/api/khuyen-mai/999999999')).status, 404);
  assert.equal((await goi('get', '/api/khuyen-mai/abc')).status, 400);
  const seed = await goi('get', '/api/khuyen-mai/1'); // khuyến mãi mẫu
  assert.equal(seed.status, 200);
  assert.ok(seed.body.data.san_pham.length >= 3);
});

// ---------- KM-02 ----------
test('KM-02: sửa từng phần, giữ nguyên trường không gửi và danh sách sản phẩm', async () => {
  const k = await taoKM({ gia_tri_giam: 10, ma_san_pham: [sp1] });
  const a = await goi('patch', `/api/khuyen-mai/${k.ma_khuyen_mai}`, 'admin').send({ ten_khuyen_mai: '  TEST_KM_doi_ten  ', gia_tri_giam: 25 });
  assert.equal(a.status, 200, JSON.stringify(a.body));
  assert.equal(a.body.data.ten_khuyen_mai, 'TEST_KM_doi_ten');
  assert.equal(a.body.data.gia_tri_giam, 25);
  assert.equal(a.body.data.loai_giam, 'phan_tram');
  assert.deepEqual(a.body.data.san_pham.map(s => s.ma_san_pham), [sp1]);
  const b = await goi('patch', `/api/khuyen-mai/${k.ma_khuyen_mai}`).send({ loai_giam: 'so_tien', gia_tri_giam: 4000, ngay_ket_thuc: luc(60) });
  assert.equal(b.status, 200);
  assert.equal(b.body.data.loai_giam, 'so_tien');
  assert.equal(b.body.data.gia_tri_giam, 4000);
  assert.equal((await goi('patch', `/api/khuyen-mai/${k.ma_khuyen_mai}`, 'nhanvien').send({ gia_tri_giam: 1 })).status, 403);
});

test('KM-02: kiểm tra trên giá trị SAU khi gộp với dữ liệu cũ; lỗi thì không đổi gì', async () => {
  const k = await taoKM({ loai_giam: 'so_tien', gia_tri_giam: 50000 });
  const duong = `/api/khuyen-mai/${k.ma_khuyen_mai}`;
  // đổi loại sang phần trăm mà giữ giá trị 50000 -> vượt 100%
  const r1 = await goi('patch', duong).send({ loai_giam: 'phan_tram' });
  assert.equal(r1.status, 400);
  // chỉ đẩy ngày bắt đầu vượt ngày kết thúc cũ
  assert.equal((await goi('patch', duong).send({ ngay_bat_dau: luc(40) })).status, 400);
  // chỉ lùi ngày kết thúc về trước ngày bắt đầu cũ
  assert.equal((await goi('patch', duong).send({ ngay_ket_thuc: luc(-3) })).status, 400);
  for (const body of [{}, { gia_tri_giam: 0 }, { gia_tri_giam: '5' }, { ten_khuyen_mai: '' }, { ngay_bat_dau: 'abc' }, { ma_san_pham: [sp1] }, { diem: 1 }]) {
    assert.equal((await goi('patch', duong).send(body)).status, 400, JSON.stringify(body));
  }
  const sau = (await goi('get', duong)).body.data;
  assert.equal(sau.loai_giam, 'so_tien');
  assert.equal(sau.gia_tri_giam, 50000);
  assert.equal(new Date(sau.ngay_ket_thuc).getTime(), new Date(k.ngay_ket_thuc).getTime(), 'lỗi thì không đổi gì');
  assert.equal((await goi('patch', '/api/khuyen-mai/999999999').send({ gia_tri_giam: 1 })).status, 404);
  // hợp lệ khi đổi cả loại và giá trị cùng lúc
  assert.equal((await goi('patch', duong).send({ loai_giam: 'phan_tram', gia_tri_giam: 50 })).status, 200);
});

// ---------- KM-04 / KM-05 ----------
test('KM-04: thêm sản phẩm (bỏ qua cặp đã có), trả danh sách hiện tại; lỗi 404/400', async () => {
  const k = await taoKM({ ma_san_pham: [sp1] });
  const duong = `/api/khuyen-mai/${k.ma_khuyen_mai}/san-pham`;
  const a = await goi('post', duong).send({ ma_san_pham: [sp1, sp2] });
  assert.equal(a.status, 200, JSON.stringify(a.body));
  assert.deepEqual(a.body.data.map(s => s.ma_san_pham), [sp1, sp2]);
  assert.deepEqual(Object.keys(a.body.data[0]).sort(), ['gia_ban', 'ma_san_pham', 'ten_san_pham', 'trang_thai']);
  assert.equal((await goi('post', duong).send({ ma_san_pham: [sp2] })).body.data.length, 2, 'thêm lại không nhân đôi');
  const khongCo = await goi('post', duong).send({ ma_san_pham: [sp1, 999999993] });
  assert.equal(khongCo.status, 404);
  assert.equal((await goi('post', '/api/khuyen-mai/999999999/san-pham').send({ ma_san_pham: [sp1] })).status, 404);
  for (const body of [{}, { ma_san_pham: [] }, { ma_san_pham: 3 }, { ma_san_pham: [0] }]) {
    assert.equal((await goi('post', duong).send(body)).status, 400, JSON.stringify(body));
  }
  assert.equal((await goi('post', duong, 'nhanvien').send({ ma_san_pham: [sp1] })).status, 403);
  assert.deepEqual(await laySp(k.ma_khuyen_mai), [sp1, sp2]);
});

test('KM-05: gỡ sản phẩm, trả danh sách còn lại; không thuộc khuyến mãi -> 404', async () => {
  const k = await taoKM({ ma_san_pham: [sp1, sp2] });
  const a = await goi('delete', `/api/khuyen-mai/${k.ma_khuyen_mai}/san-pham/${sp1}`);
  assert.equal(a.status, 200);
  assert.deepEqual(a.body.data.map(s => s.ma_san_pham), [sp2]);
  assert.equal((await goi('delete', `/api/khuyen-mai/${k.ma_khuyen_mai}/san-pham/${sp1}`)).status, 404, 'gỡ lần hai');
  assert.equal((await goi('delete', `/api/khuyen-mai/999999999/san-pham/${sp1}`)).status, 404);
  assert.equal((await goi('delete', `/api/khuyen-mai/${k.ma_khuyen_mai}/san-pham/abc`)).status, 400);
  assert.equal((await goi('delete', `/api/khuyen-mai/${k.ma_khuyen_mai}/san-pham/${sp2}`, 'nhanvien')).status, 403);
  const het = await goi('delete', `/api/khuyen-mai/${k.ma_khuyen_mai}/san-pham/${sp2}`);
  assert.deepEqual(het.body.data, [], 'gỡ hết vẫn hợp lệ');
});

test('KM-04/05: thêm đồng thời cùng một sản phẩm không tạo trùng, không lỗi', async () => {
  const k = await taoKM();
  const duong = `/api/khuyen-mai/${k.ma_khuyen_mai}/san-pham`;
  const kq = await Promise.all([1, 2, 3, 4].map(() => goi('post', duong).send({ ma_san_pham: [sp1, sp2] })));
  for (const r of kq) assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(await laySp(k.ma_khuyen_mai), [sp1, sp2]);
});

// ---------- KM-03 ----------
test('KM-03: xóa khuyến mãi chưa dùng (xóa luôn liên kết sản phẩm); 404; nhân viên 403', async () => {
  const k = await taoKM({ ma_san_pham: [sp1, sp2] });
  assert.equal((await goi('delete', `/api/khuyen-mai/${k.ma_khuyen_mai}`, 'nhanvien')).status, 403);
  const res = await goi('delete', `/api/khuyen-mai/${k.ma_khuyen_mai}`);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data, { da_xoa: true });
  assert.equal((await goi('get', `/api/khuyen-mai/${k.ma_khuyen_mai}`)).status, 404);
  assert.equal((await pool.query('SELECT COUNT(*) AS n FROM KhuyenMaiSanPham WHERE ma_khuyen_mai = ?', [k.ma_khuyen_mai]))[0][0].n, 0);
  assert.equal((await goi('delete', `/api/khuyen-mai/${k.ma_khuyen_mai}`)).status, 404, 'xóa lần hai');
});

test('KM-03: đã được dùng thì 409 (còn nguyên), gợi ý kết thúc sớm; lượt dùng tính theo ly; sửa không đổi hóa đơn cũ', async () => {
  const k = await taoKM();
  const dong = await taoDongDaDung(k.ma_khuyen_mai, 2, 2900);
  const huy = await taoDongDaDung(k.ma_khuyen_mai, 3, 2900);
  assert.equal((await goi('post', `/api/hoa-don/${huy.ma_hoa_don}/huy`, 'nhanvien').send({})).status, 200);

  const chiTiet = (await goi('get', `/api/khuyen-mai/${k.ma_khuyen_mai}`)).body.data;
  assert.equal(chiTiet.so_luot_dung, 2, 'đếm theo LY (2 ly), bỏ qua order đã hủy (3 ly)');
  const ds = (await goi('get', '/api/khuyen-mai?trang_thai=dang_chay&moi_trang=100')).body.data.find(x => x.ma_khuyen_mai === k.ma_khuyen_mai);
  assert.equal(ds.so_luot_dung, 2);

  const xoa = await goi('delete', `/api/khuyen-mai/${k.ma_khuyen_mai}`);
  assert.equal(xoa.status, 409);
  assert.equal(xoa.body.loi, 'KHUYEN_MAI_DA_DUOC_DUNG');
  assert.match(xoa.body.thong_bao, /ngay_ket_thuc/);
  assert.equal((await goi('get', `/api/khuyen-mai/${k.ma_khuyen_mai}`)).status, 200, 'vẫn còn');
  assert.equal((await laySp(k.ma_khuyen_mai)).length, 2, 'xóa lỗi thì liên kết sản phẩm cũng còn');

  // Cách thay thế: kết thúc ngay -> hết hạn; hóa đơn cũ không đổi
  const ketThuc = await goi('patch', `/api/khuyen-mai/${k.ma_khuyen_mai}`).send({ gia_tri_giam: 99, ngay_ket_thuc: new Date(Date.now() - 1000).toISOString() });
  assert.equal(ketThuc.status, 200);
  assert.equal(ketThuc.body.data.trang_thai, 'het_han');
  const hd = (await goi('get', `/api/hoa-don/${dong.ma_hoa_don}`, 'nhanvien')).body.data;
  assert.equal(hd.chi_tiet[0].giam_gia, 5800, 'mức giảm đã chụp không đổi khi sửa khuyến mãi');
  const [[{ muc }]] = await pool.query('SELECT muc_giam_moi_ly AS muc FROM ChiTietHoaDonKhuyenMai WHERE ma_chi_tiet = ?', [dong.ma_chi_tiet]);
  assert.equal(muc, 2900);
  assert.equal((await goi('delete', `/api/khuyen-mai/${k.ma_khuyen_mai}`)).status, 409, 'hết hạn vẫn không xóa được');
});

test('KM-03: xóa dòng hóa đơn thì mức giảm của dòng đó xóa theo; xóa đồng thời 2 lần: đúng 1 thành công', async () => {
  const k = await taoKM();
  const dong = await taoDongDaDung(k.ma_khuyen_mai, 1);
  await pool.query('DELETE FROM ChiTietHoaDon WHERE ma_chi_tiet = ?', [dong.ma_chi_tiet]);
  assert.equal((await pool.query('SELECT COUNT(*) AS n FROM ChiTietHoaDonKhuyenMai WHERE ma_khuyen_mai = ?', [k.ma_khuyen_mai]))[0][0].n, 0, 'CASCADE');
  const kq = await Promise.all([1, 2, 3].map(() => goi('delete', `/api/khuyen-mai/${k.ma_khuyen_mai}`)));
  assert.deepEqual(kq.map(r => r.status).sort(), [200, 404, 404]);
});
