// Test 8b – module kho: KHO-03 công thức, KHO-04 lập phiếu nhập, KHO-05 lịch sử nhập.
// Dữ liệu riêng: nguyên liệu TEST_NH_NL_*, nhà cung cấp TEST_NH_NCC_*, danh mục TEST_NH_DM, sản phẩm TEST_NH_SP_*. KHÔNG dùng tiền tố TEST_KHO_ / TEST_NL_
// (hai file test kho khác tự dọn theo tiền tố đó). Khẳng định danh sách chỉ nhìn vào dữ liệu của chính file này (lọc theo ma_ncc riêng).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'khoa-chi-dung-cho-test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const pool = require('../src/config/db');
const { taoApp } = require('../src/app');

const app = taoApp();
const token = {};
const hoaDonTao = [];
const dot = `${Date.now()}`.slice(-8);
let dem = 0; let maDm; let maNvQuanLy; let maNvAdmin;
const ten = loai => `TEST_NH_${loai}_${dot}_${dem++}`;

const goi = (pt, duong, nguoi = 'quanly') => {
  const r = request(app)[pt](duong);
  return nguoi ? r.set('Authorization', `Bearer ${token[nguoi]}`) : r;
};
const nlSql = async (ton = 0, muc = 0, dv = 'g') =>
  (await pool.query('INSERT INTO NguyenLieu (ten_nguyen_lieu, don_vi_tinh, so_luong_ton, muc_ton_toi_thieu) VALUES (?, ?, ?, ?)', [ten('NL'), dv, ton, muc]))[0].insertId;
const spSql = async () =>
  (await pool.query('INSERT INTO SanPham (ma_danh_muc, ten_san_pham, gia_ban) VALUES (?, ?, 20000)', [maDm, ten('SP')]))[0].insertId;
const nccApi = async () => (await goi('post', '/api/kho/nha-cung-cap').send({ ten_ncc: ten('NCC') })).body.data.ma_ncc;
const ton = async ma => (await pool.query('SELECT so_luong_ton FROM NguyenLieu WHERE ma_nguyen_lieu = ?', [ma]))[0][0].so_luong_ton;
const demPhieu = async ncc => (await pool.query('SELECT COUNT(*) AS n FROM PhieuNhap WHERE ma_ncc = ?', [ncc]))[0][0].n;
const nhap = (ncc, items, ghiDe = {}, nguoi = 'quanly') => goi('post', '/api/kho/phieu-nhap', nguoi).send({ ma_ncc: ncc, items, ...ghiDe });
const dong = (nl, sl = 10, gia = 1000) => ({ ma_nguyen_lieu: nl, so_luong_nhap: sl, don_gia_nhap: gia });
const congThuc = async sp => (await pool.query('SELECT ma_nguyen_lieu, dinh_luong FROM CongThuc WHERE ma_san_pham = ? ORDER BY ma_nguyen_lieu', [sp]))[0];

async function donDep() {
  const [rows] = await pool.query(`SELECT DISTINCT c.ma_hoa_don FROM ChiTietHoaDon c JOIN SanPham s ON s.ma_san_pham = c.ma_san_pham WHERE s.ten_san_pham LIKE 'TEST\\_NH\\_%'`);
  const ids = [...new Set([...hoaDonTao, ...rows.map(r => r.ma_hoa_don)])];
  if (ids.length) {
    await pool.query('DELETE FROM ChiTietHoaDon WHERE ma_hoa_don IN (?)', [ids]);
    await pool.query('DELETE FROM HoaDon WHERE ma_hoa_don IN (?)', [ids]);
  }
  await pool.query("DELETE ct FROM CongThuc ct JOIN SanPham s ON s.ma_san_pham = ct.ma_san_pham WHERE s.ten_san_pham LIKE 'TEST\\_NH\\_%'");
  await pool.query("DELETE ct FROM CongThuc ct JOIN NguyenLieu n ON n.ma_nguyen_lieu = ct.ma_nguyen_lieu WHERE n.ten_nguyen_lieu LIKE 'TEST\\_NH\\_%'");
  await pool.query("DELETE c FROM ChiTietNhap c JOIN NguyenLieu n ON n.ma_nguyen_lieu = c.ma_nguyen_lieu WHERE n.ten_nguyen_lieu LIKE 'TEST\\_NH\\_%'");
  await pool.query("DELETE c FROM ChiTietNhap c JOIN PhieuNhap p ON p.ma_phieu_nhap = c.ma_phieu_nhap JOIN NhaCungCap n ON n.ma_ncc = p.ma_ncc WHERE n.ten_ncc LIKE 'TEST\\_NH\\_%'");
  await pool.query("DELETE p FROM PhieuNhap p JOIN NhaCungCap n ON n.ma_ncc = p.ma_ncc WHERE n.ten_ncc LIKE 'TEST\\_NH\\_%'");
  await pool.query("DELETE FROM NhaCungCap WHERE ten_ncc LIKE 'TEST\\_NH\\_%'");
  await pool.query("DELETE FROM NguyenLieu WHERE ten_nguyen_lieu LIKE 'TEST\\_NH\\_%'");
  await pool.query("DELETE FROM SanPham WHERE ten_san_pham LIKE 'TEST\\_NH\\_%'");
  await pool.query("DELETE FROM DanhMuc WHERE ten_danh_muc LIKE 'TEST\\_NH\\_%'");
  hoaDonTao.length = 0;
}

before(async () => {
  await donDep();
  for (const [t, mk] of [['admin', 'Admin@123'], ['quanly', 'Quanly@123'], ['nhanvien', 'Nhanvien@123']]) {
    const res = await request(app).post('/api/auth/dang-nhap').send({ ten_dang_nhap: t, mat_khau: mk });
    token[t] = res.body.data.token;
  }
  const nv = ten => pool.query('SELECT ma_nhan_vien FROM TaiKhoan WHERE ten_dang_nhap = ?', [ten]).then(r => r[0][0].ma_nhan_vien);
  maNvQuanLy = await nv('quanly'); maNvAdmin = await nv('admin');
  maDm = (await pool.query("INSERT INTO DanhMuc (ten_danh_muc) VALUES ('TEST_NH_DM')"))[0].insertId;
});
after(async () => {
  await donDep();
  await pool.end();
});

// ---------- KHO-03 ----------
test('KHO-03: đặt công thức; đặt lại thay TOÀN BỘ công thức cũ; mảng rỗng = xóa công thức; xem lại bằng GET', async () => {
  const sp = await spSql(); const a = await nlSql(0, 0, 'g'); const b = await nlSql(0, 0, 'ml'); const c = await nlSql();
  const r1 = await goi('put', `/api/kho/cong-thuc/${sp}`, 'admin').send({ nguyen_lieu: [{ ma_nguyen_lieu: b, dinh_luong: 30.5 }, { ma_nguyen_lieu: a, dinh_luong: 20 }] });
  assert.equal(r1.status, 200, JSON.stringify(r1.body));
  assert.equal(r1.body.data.ma_san_pham, sp);
  assert.deepEqual(r1.body.data.nguyen_lieu.map(x => [x.ma_nguyen_lieu, x.dinh_luong, x.don_vi_tinh]), [[a, 20, 'g'], [b, 30.5, 'ml']]);
  assert.ok(r1.body.data.nguyen_lieu[0].ten_nguyen_lieu.startsWith('TEST_NH_NL_'));
  const r2 = await goi('put', `/api/kho/cong-thuc/${sp}`).send({ nguyen_lieu: [{ ma_nguyen_lieu: c, dinh_luong: 0.125 }, { ma_nguyen_lieu: b, dinh_luong: 1 }] });
  assert.deepEqual(r2.body.data.nguyen_lieu.map(x => [x.ma_nguyen_lieu, x.dinh_luong]), [[b, 1], [c, 0.125]], 'a bị thay ra, không còn');
  assert.deepEqual((await congThuc(sp)).map(x => x.ma_nguyen_lieu), [b, c]);
  const g = await goi('get', `/api/kho/cong-thuc/${sp}`);
  assert.deepEqual(g.body.data.nguyen_lieu.map(x => x.ma_nguyen_lieu), [b, c]);
  const r3 = await goi('put', `/api/kho/cong-thuc/${sp}`).send({ nguyen_lieu: [] });
  assert.equal(r3.status, 200);
  assert.deepEqual(r3.body.data.nguyen_lieu, []);
  assert.equal((await congThuc(sp)).length, 0);
});

test('KHO-03: công thức mới có hiệu lực ngay với bán hàng (menu giới hạn số ly, order trừ đúng định lượng)', async () => {
  const sp = await spSql(); const nl = await nlSql(100, 0);
  await goi('put', `/api/kho/cong-thuc/${sp}`).send({ nguyen_lieu: [{ ma_nguyen_lieu: nl, dinh_luong: 30 }] });
  const tenSp = (await pool.query('SELECT ten_san_pham FROM SanPham WHERE ma_san_pham = ?', [sp]))[0][0].ten_san_pham;
  const menu = (await goi('get', `/api/san-pham/menu?tu_khoa=${encodeURIComponent(tenSp)}`, 'nhanvien')).body.data;
  const mon = (menu.nhom ? menu.nhom.flatMap(n => n.san_pham) : menu).find(m => m.ma_san_pham === sp);
  assert.equal(mon.so_ly_toi_da, 3, '100g / 30g = 3 ly');
  const od = await goi('post', '/api/hoa-don', 'nhanvien').send({ items: [{ ma_san_pham: sp, so_luong: 2 }] });
  assert.equal(od.status, 201, JSON.stringify(od.body));
  hoaDonTao.push(od.body.data.ma_hoa_don);
  assert.equal(await ton(nl), 40);
  const qua = await goi('post', '/api/hoa-don', 'nhanvien').send({ items: [{ ma_san_pham: sp, so_luong: 2 }] });
  assert.equal(qua.status, 409);
  assert.equal(qua.body.loi, 'KHONG_DU_NGUYEN_LIEU');
});

test('KHO-03: đầu vào sai 400; không có sản phẩm/nguyên liệu 404 và công thức cũ giữ NGUYÊN (một transaction); quyền', async () => {
  const sp = await spSql(); const a = await nlSql(); const b = await nlSql();
  await goi('put', `/api/kho/cong-thuc/${sp}`).send({ nguyen_lieu: [{ ma_nguyen_lieu: a, dinh_luong: 7 }] });
  const dl = (ma, dinh_luong) => ({ ma_nguyen_lieu: ma, dinh_luong });
  const sai = [
    {}, { nguyen_lieu: 'x' }, { nguyen_lieu: [dl(a, 0)] }, { nguyen_lieu: [dl(a, -1)] }, { nguyen_lieu: [dl(a, 1.2345)] }, { nguyen_lieu: [dl(a, '5')] },
    { nguyen_lieu: [dl(a, 1e12)] }, { nguyen_lieu: [{ ma_nguyen_lieu: a }] }, { nguyen_lieu: [{ dinh_luong: 5 }] }, { nguyen_lieu: [dl(0, 5)] }, { nguyen_lieu: [dl(1.5, 5)] },
    { nguyen_lieu: [dl(a, 5), dl(a, 6)] }, { nguyen_lieu: [{ ...dl(a, 5), them: 1 }] }, { nguyen_lieu: [dl(a, 5)], truong_la: 1 },
    { nguyen_lieu: Array.from({ length: 51 }, (_, i) => dl(i + 1, 1)) },
  ];
  for (const b2 of sai) {
    const r = await goi('put', `/api/kho/cong-thuc/${sp}`).send(b2);
    assert.equal(r.status, 400, JSON.stringify(b2).slice(0, 80));
  }
  assert.deepEqual((await congThuc(sp)).map(x => [x.ma_nguyen_lieu, x.dinh_luong]), [[a, 7]], 'sai đầu vào thì công thức cũ còn nguyên');
  const khongNl = await goi('put', `/api/kho/cong-thuc/${sp}`).send({ nguyen_lieu: [dl(b, 1), dl(999999999, 1)] });
  assert.equal(khongNl.status, 404);
  assert.deepEqual((await congThuc(sp)).map(x => x.ma_nguyen_lieu), [a], 'thiếu một nguyên liệu thì không đổi gì (kể cả dòng hợp lệ)');
  assert.equal((await goi('put', '/api/kho/cong-thuc/999999999').send({ nguyen_lieu: [dl(b, 1)] })).status, 404);
  assert.equal((await goi('get', '/api/kho/cong-thuc/999999999')).status, 404);
  assert.equal((await goi('put', '/api/kho/cong-thuc/abc').send({ nguyen_lieu: [] })).status, 400);
  assert.equal((await goi('put', `/api/kho/cong-thuc/${sp}`, 'nhanvien').send({ nguyen_lieu: [] })).status, 403);
  assert.equal((await goi('put', `/api/kho/cong-thuc/${sp}`, null).send({ nguyen_lieu: [] })).status, 401);
  assert.equal((await goi('get', `/api/kho/cong-thuc/${sp}`, 'nhanvien')).status, 403);
});

test('KHO-03 đồng thời: nhiều người đặt công thức khác nhau cho cùng sản phẩm -> kết quả là ĐÚNG MỘT bộ, không trộn, không 500', async () => {
  const sp = await spSql(); const nls = [await nlSql(), await nlSql(), await nlSql(), await nlSql()];
  const bo = [[nls[0], nls[1]], [nls[2], nls[3]], [nls[3], nls[1], nls[0]], [nls[1]]];
  for (let v = 0; v < 10; v++) {
    const rs = await Promise.all(bo.map((b, i) => goi('put', `/api/kho/cong-thuc/${sp}`).send({ nguyen_lieu: b.map(m => ({ ma_nguyen_lieu: m, dinh_luong: i + 1 })) })));
    for (const r of rs) assert.equal(r.status, 200, JSON.stringify(r.body));
    const cuoi = await congThuc(sp);
    const khop = bo.some((b, i) => cuoi.length === b.length && [...b].sort((x, y) => x - y).every((m, k) => cuoi[k].ma_nguyen_lieu === m && cuoi[k].dinh_luong === i + 1));
    assert.ok(khop, `công thức bị trộn: ${JSON.stringify(cuoi)}`);
  }
});

test('KHO-03 đồng thời: đặt công thức trong lúc có người gọi món cùng sản phẩm -> chỉ 201/409, không 500, tồn không âm và khớp số ly đã bán', async () => {
  const sp = await spSql(); const a = await nlSql(1000, 0); const b = await nlSql(1000, 0);
  await goi('put', `/api/kho/cong-thuc/${sp}`).send({ nguyen_lieu: [{ ma_nguyen_lieu: a, dinh_luong: 10 }] });
  for (let v = 0; v < 12; v++) {
    const [p1, o1, o2, p2] = await Promise.all([
      goi('put', `/api/kho/cong-thuc/${sp}`).send({ nguyen_lieu: [{ ma_nguyen_lieu: b, dinh_luong: 10 }, { ma_nguyen_lieu: a, dinh_luong: 5 }] }),
      goi('post', '/api/hoa-don', 'nhanvien').send({ items: [{ ma_san_pham: sp, so_luong: 1 }] }),
      goi('post', '/api/hoa-don', 'nhanvien').send({ items: [{ ma_san_pham: sp, so_luong: 1 }] }),
      goi('put', `/api/kho/cong-thuc/${sp}`).send({ nguyen_lieu: [{ ma_nguyen_lieu: a, dinh_luong: 10 }] }),
    ]);
    for (const r of [p1, p2]) assert.equal(r.status, 200, JSON.stringify(r.body));
    for (const r of [o1, o2]) { assert.ok([201, 409].includes(r.status), JSON.stringify(r.body)); if (r.status === 201) hoaDonTao.push(r.body.data.ma_hoa_don); }
    assert.ok((await ton(a)) >= 0 && (await ton(b)) >= 0);
  }
});

// ---------- KHO-04 ----------
test('KHO-04: lập phiếu nhập: tổng = Σ, cộng đúng tồn, ghi đúng nhân viên, trả ton_moi; admin và quản lý đều lập được', async () => {
  const ncc = await nccApi(); const a = await nlSql(5, 100); const b = await nlSql(0, 50, 'ml');
  const r = await nhap(ncc, [dong(a, 10, 12000), dong(b, 2.5, 80000.5)]);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const d = r.body.data;
  assert.equal(d.tong_tien_nhap, 120000 + 200001.25);
  assert.equal(d.ma_ncc, ncc);
  assert.ok(Number.isInteger(d.ma_phieu_nhap) && d.ngay_nhap);
  const tonMoi = Object.fromEntries(d.ton_moi.map(x => [x.ma_nguyen_lieu, x]));
  assert.deepEqual([tonMoi[a].so_luong_ton, tonMoi[a].sap_het, tonMoi[b].so_luong_ton, tonMoi[b].sap_het], [15, true, 2.5, true]);
  assert.equal(d.ton_moi.length, 2);
  assert.deepEqual(d.chi_tiet.map(x => [x.ma_nguyen_lieu, x.so_luong_nhap, x.don_gia_nhap, x.thanh_tien]), [[a, 10, 12000, 120000], [b, 2.5, 80000.5, 200001.25]].sort((x, y) => x[0] - y[0]));
  assert.equal(await ton(a), 15); assert.equal(await ton(b), 2.5);
  const [pn] = (await pool.query('SELECT ma_nhan_vien, tong_tien_nhap FROM PhieuNhap WHERE ma_phieu_nhap = ?', [d.ma_phieu_nhap]))[0];
  assert.deepEqual([pn.ma_nhan_vien, pn.tong_tien_nhap], [maNvQuanLy, 320001.25]);
  const ad = await nhap(ncc, [dong(a, 100, 1)], {}, 'admin');
  assert.equal(ad.status, 201);
  assert.equal(ad.body.data.ton_moi[0].so_luong_ton, 115);
  assert.equal(ad.body.data.ton_moi[0].sap_het, false);
  assert.equal((await pool.query('SELECT ma_nhan_vien FROM PhieuNhap WHERE ma_phieu_nhap = ?', [ad.body.data.ma_phieu_nhap]))[0][0].ma_nhan_vien, maNvAdmin);
});

test('KHO-04: tiền từng dòng làm tròn nửa lên đến 1 xu rồi mới cộng (không lỗi số thực)', async () => {
  const ncc = await nccApi(); const a = await nlSql(); const b = await nlSql(); const c = await nlSql();
  // 0.333 x 100.55 = 33.48315 -> 33.48 ; 0.5 x 0.01 = 0.005 -> 0.01 ; 3 x 0.1 = 0.3 (số thực 0.30000000000000004)
  const r = await nhap(ncc, [dong(a, 0.333, 100.55), dong(b, 0.5, 0.01), dong(c, 3, 0.1)]);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.deepEqual(r.body.data.chi_tiet.map(x => x.thanh_tien), [33.48, 0.01, 0.3]);
  assert.equal(r.body.data.tong_tien_nhap, 33.79);
});

test('KHO-04: đầu vào sai 400; không có NCC/nguyên liệu 404 và KHÔNG đổi gì (không phiếu, tồn nguyên)', async () => {
  const ncc = await nccApi(); const a = await nlSql(7, 0);
  const ok1 = dong(a, 1, 1);
  const sai = [
    { ma_ncc: ncc }, { ma_ncc: ncc, items: [] }, { ma_ncc: ncc, items: 'x' }, { items: [ok1] }, { ma_ncc: 'x', items: [ok1] }, { ma_ncc: 0, items: [ok1] },
    { ma_ncc: ncc, items: [dong(a, 0, 1)] }, { ma_ncc: ncc, items: [dong(a, -1, 1)] }, { ma_ncc: ncc, items: [dong(a, 1.2345, 1)] },
    { ma_ncc: ncc, items: [dong(a, 1, 0)] }, { ma_ncc: ncc, items: [dong(a, 1, -5)] }, { ma_ncc: ncc, items: [dong(a, 1, 1.234)] },
    { ma_ncc: ncc, items: [dong(a, '1', 1)] }, { ma_ncc: ncc, items: [{ ma_nguyen_lieu: a, so_luong_nhap: 1 }] }, { ma_ncc: ncc, items: [{ ...ok1, them: 1 }] },
    { ma_ncc: ncc, items: [ok1, ok1] }, { ma_ncc: ncc, items: [ok1], truong_la: 1 },
    { ma_ncc: ncc, items: [ok1], ngay_nhap: 'hom nay' }, { ma_ncc: ncc, items: [ok1], ngay_nhap: '2026-01-05' }, { ma_ncc: ncc, items: [ok1], ngay_nhap: '2099-01-01T08:00' },
    { ma_ncc: ncc, items: [ok1], ngay_nhap: '2026-13-45T08:00' },
    { ma_ncc: ncc, items: Array.from({ length: 101 }, (_, i) => dong(i + 1)) },
    { ma_ncc: ncc, items: [dong(a, 99999999999, 9999999999)] }, // tổng tiền vượt giới hạn
  ];
  for (const b of sai) {
    const r = await goi('post', '/api/kho/phieu-nhap').send(b);
    assert.equal(r.status, 400, JSON.stringify(b).slice(0, 90));
  }
  assert.equal((await nhap(999999999, [ok1])).status, 404);
  const khongNl = await nhap(ncc, [ok1, dong(999999999, 1, 1)]);
  assert.equal(khongNl.status, 404);
  assert.equal(await demPhieu(ncc), 0);
  assert.equal(await ton(a), 7, 'dòng hợp lệ cũng không được cộng khi cả phiếu bị từ chối');
  assert.equal((await nhap(ncc, [ok1], {}, 'nhanvien')).status, 403);
  assert.equal((await nhap(ncc, [ok1], {}, null)).status, 401);
  assert.equal(await demPhieu(ncc), 0);
});

test('KHO-04: nhập vượt giới hạn lưu trữ của tồn kho -> 409, tồn và phiếu không đổi; ngày nhập trong quá khứ được ghi đúng', async () => {
  const ncc = await nccApi(); const gan = await nlSql(99999999999, 0);
  const r = await nhap(ncc, [dong(gan, 5, 1)]);
  assert.equal(r.status, 409); assert.equal(r.body.loi, 'TON_KHO_VUOT_GIOI_HAN');
  assert.equal(await ton(gan), 99999999999);
  assert.equal(await demPhieu(ncc), 0);
  const nl = await nlSql();
  const q = await nhap(ncc, [dong(nl, 1, 5)], { ngay_nhap: '2026-03-05T09:30:00' });
  assert.equal(q.status, 201, JSON.stringify(q.body));
  const [[row]] = await pool.query("SELECT DATE_FORMAT(ngay_nhap, '%Y-%m-%d %H:%i:%s') AS n FROM PhieuNhap WHERE ma_phieu_nhap = ?", [q.body.data.ma_phieu_nhap]);
  assert.equal(row.n, '2026-03-05 09:30:00');
});

test('KHO-04 đồng thời: nhiều phiếu cùng lúc (tập nguyên liệu chồng chéo, thứ tự ngược nhau) -> tất cả 201, tồn = đầu + Σ nhập, không 500', async () => {
  const ncc = await nccApi(); const a = await nlSql(0, 0); const b = await nlSql(0, 0); const c = await nlSql(0, 0);
  const moi = [[a, b], [b, a], [c, a, b], [b, c], [a], [c, b, a]];
  let tongA = 0; let tongB = 0; let tongC = 0;
  for (let v = 0; v < 8; v++) {
    const rs = await Promise.all(moi.map(ds => nhap(ncc, ds.map(m => dong(m, 1.5, 10)))));
    for (const r of rs) assert.equal(r.status, 201, JSON.stringify(r.body));
    for (const ds of moi) { if (ds.includes(a)) tongA += 1.5; if (ds.includes(b)) tongB += 1.5; if (ds.includes(c)) tongC += 1.5; }
    assert.deepEqual([await ton(a), await ton(b), await ton(c)], [tongA, tongB, tongC]);
  }
  assert.equal(await demPhieu(ncc), 8 * moi.length);
});

test('KHO-04 đồng thời: nhập hàng cùng lúc với bán hàng cùng nguyên liệu -> tồn cuối = đầu + Σ nhập − Σ đã trừ, luôn >= 0', async () => {
  const ncc = await nccApi(); const nl = await nlSql(50, 0); const sp = await spSql();
  await goi('put', `/api/kho/cong-thuc/${sp}`).send({ nguyen_lieu: [{ ma_nguyen_lieu: nl, dinh_luong: 10 }] });
  let nhapTong = 0; let ban = 0;
  for (let v = 0; v < 10; v++) {
    const rs = await Promise.all([
      nhap(ncc, [dong(nl, 20, 1)]), nhap(ncc, [dong(nl, 5, 1)]),
      goi('post', '/api/hoa-don', 'nhanvien').send({ items: [{ ma_san_pham: sp, so_luong: 2 }] }),
      goi('post', '/api/hoa-don', 'nhanvien').send({ items: [{ ma_san_pham: sp, so_luong: 3 }] }),
    ]);
    assert.equal(rs[0].status, 201); assert.equal(rs[1].status, 201);
    nhapTong += 25;
    [[rs[2], 2], [rs[3], 3]].forEach(([r, sl]) => {
      assert.ok([201, 409].includes(r.status), JSON.stringify(r.body));
      if (r.status === 201) { ban += sl * 10; hoaDonTao.push(r.body.data.ma_hoa_don); }
    });
    const t = await ton(nl);
    assert.ok(t >= 0);
    assert.equal(t, 50 + nhapTong - ban);
  }
});

test('KHO-04 + KHO-02/01: có phiếu nhập thì không xóa được nhà cung cấp và nguyên liệu (409)', async () => {
  const ncc = await nccApi(); const nl = await nlSql();
  assert.equal((await nhap(ncc, [dong(nl, 1, 1)])).status, 201);
  assert.equal((await goi('delete', `/api/kho/nha-cung-cap/${ncc}`)).status, 409);
  const x = await goi('delete', `/api/kho/nguyen-lieu/${nl}`);
  assert.equal(x.status, 409);
  assert.deepEqual(x.body.chi_tiet, { cong_thuc: false, phieu_nhap: true });
  const doi = await goi('patch', `/api/kho/nguyen-lieu/${nl}`).send({ don_vi_tinh: 'kg' });
  assert.equal(doi.status, 409);
});

test('KHO-04 đồng thời: xóa nhà cung cấp lúc đang lập phiếu -> hoặc phiếu lập được (xóa 409) hoặc xóa trước (lập 404); không 500, không phiếu mồ côi', async () => {
  for (let v = 0; v < 12; v++) {
    const ncc = await nccApi(); const nl = await nlSql();
    const [xoa, lap] = await Promise.all([goi('delete', `/api/kho/nha-cung-cap/${ncc}`), nhap(ncc, [dong(nl, 1, 1)])]);
    assert.ok((xoa.status === 200 && lap.status === 404) || (xoa.status === 409 && lap.status === 201), `xóa ${xoa.status} / lập ${lap.status} ${JSON.stringify(lap.body)}`);
    if (xoa.status === 200) assert.equal(await ton(nl), 0, 'phiếu bị từ chối thì tồn không đổi');
    const [orphan] = await pool.query('SELECT COUNT(*) AS n FROM PhieuNhap p LEFT JOIN NhaCungCap n ON n.ma_ncc = p.ma_ncc WHERE n.ma_ncc IS NULL');
    assert.equal(orphan[0].n, 0);
  }
});

// ---------- KHO-05 ----------
test('KHO-05: lịch sử nhập: lọc theo NCC và theo NGÀY (den_ngay tính trọn ngày), mới nhất trước, tổng tiền trên toàn bộ kết quả lọc, phân trang', async () => {
  const ncc = await nccApi(); const khac = await nccApi(); const nl = await nlSql();
  const ngay = ['2026-01-05T08:00:00', '2026-01-05T23:59:59', '2026-01-06T00:00:00', '2026-01-07T12:00:00'];
  const ma = [];
  for (const [i, n] of ngay.entries()) { const r = await nhap(ncc, [dong(nl, 1, 1000 * (i + 1))], { ngay_nhap: n }); assert.equal(r.status, 201); ma.push(r.body.data.ma_phieu_nhap); }
  await nhap(khac, [dong(nl, 1, 999)], { ngay_nhap: '2026-01-06T10:00:00' });

  const tatCa = await goi('get', `/api/kho/phieu-nhap?ma_ncc=${ncc}`);
  assert.equal(tatCa.status, 200);
  assert.deepEqual(tatCa.body.data.map(x => x.ma_phieu_nhap), [...ma].reverse(), 'mới nhất trước');
  assert.deepEqual([tatCa.body.tong_so_ban_ghi, tatCa.body.tong_tien_nhap], [4, 10000]);
  const p = tatCa.body.data[0];
  assert.deepEqual([p.ten_ncc.startsWith('TEST_NH_NCC_'), p.ten_nhan_vien, p.so_dong, p.tong_tien_nhap], [true, (await pool.query('SELECT ho_ten FROM NhanVien WHERE ma_nhan_vien = ?', [maNvQuanLy]))[0][0].ho_ten, 1, 4000]);

  const ngay5 = await goi('get', `/api/kho/phieu-nhap?ma_ncc=${ncc}&tu_ngay=2026-01-05&den_ngay=2026-01-05`);
  assert.deepEqual(ngay5.body.data.map(x => x.ma_phieu_nhap), [ma[1], ma[0]], 'den_ngay bao gồm cả 23:59:59');
  assert.equal(ngay5.body.tong_tien_nhap, 3000);
  const tuNgay = await goi('get', `/api/kho/phieu-nhap?ma_ncc=${ncc}&tu_ngay=2026-01-06`);
  assert.deepEqual(tuNgay.body.data.map(x => x.ma_phieu_nhap), [ma[3], ma[2]]);
  const denNgay = await goi('get', `/api/kho/phieu-nhap?ma_ncc=${ncc}&den_ngay=2026-01-05`);
  assert.equal(denNgay.body.tong_so_ban_ghi, 2);
  // phân trang: tổng tiền vẫn là của TOÀN BỘ kết quả lọc
  const t2 = await goi('get', `/api/kho/phieu-nhap?ma_ncc=${ncc}&moi_trang=3&trang=2`);
  assert.deepEqual([t2.body.data.length, t2.body.tong_so_ban_ghi, t2.body.tong_tien_nhap, t2.body.trang, t2.body.moi_trang], [1, 4, 10000, 2, 3]);
  assert.equal((await goi('get', `/api/kho/phieu-nhap?ma_ncc=${khac}`)).body.data.length, 1);
  assert.equal((await goi('get', '/api/kho/phieu-nhap?ma_ncc=999999999')).body.data.length, 0);
});

test('KHO-05: chi tiết phiếu nhập; 404; tham số sai 400; quyền', async () => {
  const ncc = await nccApi(); const a = await nlSql(0, 0, 'g'); const b = await nlSql(0, 0, 'ml');
  const r = await nhap(ncc, [dong(b, 2, 15.5), dong(a, 4, 2500)]);
  const ma = r.body.data.ma_phieu_nhap;
  const ct = await goi('get', `/api/kho/phieu-nhap/${ma}`, 'admin');
  assert.equal(ct.status, 200);
  assert.equal(ct.body.data.ma_phieu_nhap, ma);
  assert.equal(ct.body.data.tong_tien_nhap, 10031);
  assert.deepEqual(ct.body.data.chi_tiet.map(x => [x.ma_nguyen_lieu, x.don_vi_tinh, x.so_luong_nhap, x.don_gia_nhap, x.thanh_tien]), [[a, 'g', 4, 2500, 10000], [b, 'ml', 2, 15.5, 31]].sort((x, y) => x[0] - y[0]));
  assert.equal((await goi('get', '/api/kho/phieu-nhap/999999999')).status, 404);
  assert.equal((await goi('get', '/api/kho/phieu-nhap/abc')).status, 400);
  for (const q of ['?tu_ngay=hom-nay', '?tu_ngay=2026-02-30', '?tu_ngay=2026-02-02&den_ngay=2026-02-01', '?ma_ncc=0', '?ma_ncc=x', '?moi_trang=0', '?moi_trang=101', '?trang=0']) {
    assert.equal((await goi('get', `/api/kho/phieu-nhap${q}`)).status, 400, q);
  }
  assert.equal((await goi('get', '/api/kho/phieu-nhap', 'nhanvien')).status, 403);
  assert.equal((await goi('get', `/api/kho/phieu-nhap/${ma}`, 'nhanvien')).status, 403);
  assert.equal((await goi('get', '/api/kho/phieu-nhap', null)).status, 401);
});
