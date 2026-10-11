// Test 9b – NS-04 ca làm việc, NS-05 xếp lịch, NS-06 gỡ phân công, NS-07 lịch tuần.
// Dữ liệu riêng: nhân viên TEST_LICH_*, ca TEST_LICH_*, tài khoản tlich_*. Không đụng 3 ca/3 tài khoản mẫu; lịch tuần luôn lọc theo nhân viên của mình.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'khoa-chi-dung-cho-test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const pool = require('../src/config/db');
const { taoApp } = require('../src/app');

const app = taoApp();
const token = {};
const dot = `${Date.now()}`.slice(-8);
let dem = 0;
const MK = 'Mkdau1234';
const goi = (pt, duong, nguoi = 'admin') => {
  const r = request(app)[pt](duong);
  return nguoi ? r.set('Authorization', `Bearer ${nguoi.startsWith('eyJ') ? nguoi : token[nguoi]}`) : r;
};
const iso = d => d.toISOString().slice(0, 10);
const cong = (s, n) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
let HOM_NAY; let THU_HAI;
async function taoNv(quyen = 'nhan_vien') {
  const i = dem++;
  const res = await goi('post', '/api/nhan-su').send({ ho_ten: `TEST_LICH_${dot}_${i}`, chuc_vu: 'Pha chế', ten_dang_nhap: `tlich_${dot}_${i}`, mat_khau: MK, quyen_truy_cap: quyen });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { ...res.body.data, ten_dang_nhap: `tlich_${dot}_${i}` };
}
const tokenCua = async nv => (await request(app).post('/api/auth/dang-nhap').send({ ten_dang_nhap: nv.ten_dang_nhap, mat_khau: MK })).body.data.token;
async function taoCa(gio = ['07:00', '11:00'], ten) {
  const res = await goi('post', '/api/nhan-su/ca-lam-viec').send({ ten_ca: ten || `TEST_LICH_${dot}_${dem++}`, thoi_gian_bat_dau: gio[0], thoi_gian_ket_thuc: gio[1] });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data;
}
const xep = (b, nguoi = 'admin') => goi('post', '/api/nhan-su/phan-cong', nguoi).send(b);
const dem_pc = async (nv, ca) => (await pool.query('SELECT COUNT(*) n FROM PhanCong WHERE ma_nhan_vien=? AND ma_ca=?', [nv, ca]))[0][0].n;

async function donDep() {
  const [nv] = await pool.query("SELECT ma_nhan_vien FROM NhanVien WHERE ho_ten LIKE 'TEST\\_LICH\\_%'");
  const ids = nv.map(r => r.ma_nhan_vien);
  await pool.query("DELETE pc FROM PhanCong pc JOIN CaLamViec c ON c.ma_ca = pc.ma_ca WHERE c.ten_ca LIKE 'TEST\\_LICH\\_%'");
  if (ids.length) {
    await pool.query('DELETE FROM PhanCong WHERE ma_nhan_vien IN (?)', [ids]);
    await pool.query('DELETE FROM TaiKhoan WHERE ma_nhan_vien IN (?)', [ids]);
    await pool.query('DELETE FROM NhanVien WHERE ma_nhan_vien IN (?)', [ids]);
  }
  await pool.query("DELETE FROM CaLamViec WHERE ten_ca LIKE 'TEST\\_LICH\\_%'");
}
before(async () => {
  await donDep();
  for (const [t, mk] of [['admin', 'Admin@123'], ['quanly', 'Quanly@123'], ['nhanvien', 'Nhanvien@123']]) {
    token[t] = (await request(app).post('/api/auth/dang-nhap').send({ ten_dang_nhap: t, mat_khau: mk })).body.data.token;
  }
  const [[h]] = await pool.query("SELECT DATE_FORMAT(CURDATE(),'%Y-%m-%d') d, DATE_FORMAT(CURDATE() - INTERVAL WEEKDAY(CURDATE()) DAY,'%Y-%m-%d') t");
  HOM_NAY = h.d; THU_HAI = h.t;
});
after(async () => { await donDep(); await pool.end(); });

// ---------------- NS-04 ----------------
test('NS-04 tạo ca: 201, giờ chuẩn hoá HH:mm:ss; trùng tên được phép', async () => {
  const ten = `TEST_LICH_${dot}_trung`;
  const a = await taoCa(['06:30', '10:00'], ten);
  assert.equal(a.thoi_gian_bat_dau, '06:30:00'); assert.equal(a.thoi_gian_ket_thuc, '10:00:00');
  const b = await taoCa(['13:00:30', '17:00:00'], ten);
  assert.equal(b.thoi_gian_bat_dau, '13:00:30');
  assert.notEqual(a.ma_ca, b.ma_ca);
});
test('NS-04 tạo ca: validate giờ/tên, bắt đầu phải < kết thúc', async () => {
  const p = (b) => goi('post', '/api/nhan-su/ca-lam-viec').send(b);
  const ok = { ten_ca: `TEST_LICH_${dot}_v`, thoi_gian_bat_dau: '08:00', thoi_gian_ket_thuc: '09:00' };
  for (const x of [
    { ...ok, thoi_gian_ket_thuc: '08:00' }, { ...ok, thoi_gian_ket_thuc: '07:59' }, { ...ok, thoi_gian_bat_dau: '25:00' },
    { ...ok, thoi_gian_bat_dau: '8h' }, { ...ok, thoi_gian_ket_thuc: '12:60' }, { ...ok, ten_ca: '' }, { ...ok, ten_ca: 'x'.repeat(51) },
    { ...ok, ten_ca: undefined }, { ...ok, thoi_gian_bat_dau: undefined }, { ...ok, la: 1 },
  ]) {
    const r = await p(x);
    assert.equal(r.status, 400, JSON.stringify(x) + JSON.stringify(r.body));
    assert.equal(r.body.loi, 'DU_LIEU_SAI');
  }
  assert.equal((await p({ ...ok, ten_ca: 'x'.repeat(50) })).status, 201);
  await pool.query("DELETE FROM CaLamViec WHERE ten_ca = ?", ['x'.repeat(50)]);
});
test('NS-04 phân quyền: A/Q được; N và chưa đăng nhập bị chặn', async () => {
  const ca = await taoCa();
  const b = { ten_ca: `TEST_LICH_${dot}_q`, thoi_gian_bat_dau: '08:00', thoi_gian_ket_thuc: '09:00' };
  assert.equal((await goi('post', '/api/nhan-su/ca-lam-viec', 'quanly').send(b)).status, 201);
  for (const [pt, d] of [['post', '/api/nhan-su/ca-lam-viec'], ['get', '/api/nhan-su/ca-lam-viec'], ['get', `/api/nhan-su/ca-lam-viec/${ca.ma_ca}`], ['patch', `/api/nhan-su/ca-lam-viec/${ca.ma_ca}`], ['delete', `/api/nhan-su/ca-lam-viec/${ca.ma_ca}`]]) {
    assert.equal((await goi(pt, d, 'nhanvien').send(b)).status, 403, `${pt} ${d}`);
    assert.equal((await goi(pt, d, null).send(b)).status, 401, `${pt} ${d}`);
  }
});
test('NS-04 danh sách có so_phan_cong, chi tiết 404/400', async () => {
  const ca = await taoCa(); const nv = await taoNv();
  assert.equal((await xep({ ma_nhan_vien: nv.ma_nhan_vien, ma_ca: ca.ma_ca, ngay_lam: [cong(HOM_NAY, 1), cong(HOM_NAY, 2)] })).status, 201);
  const ds = await goi('get', '/api/nhan-su/ca-lam-viec', 'quanly');
  assert.equal(ds.status, 200);
  const toi = ds.body.data.find(c => c.ma_ca === ca.ma_ca);
  assert.equal(Number(toi.so_phan_cong), 2);
  assert.ok(ds.body.data.some(c => c.ma_ca === 1), 'ca mẫu có trong danh sách');
  const ct = await goi('get', `/api/nhan-su/ca-lam-viec/${ca.ma_ca}`);
  assert.equal(ct.status, 200); assert.equal(ct.body.data.ten_ca, ca.ten_ca);
  assert.equal((await goi('get', '/api/nhan-su/ca-lam-viec/99999999')).status, 404);
  assert.equal((await goi('get', '/api/nhan-su/ca-lam-viec/abc')).status, 400);
});
test('NS-04 sửa ca: một phần, kiểm tra start<end trên dữ liệu đã gộp, 404, body rỗng', async () => {
  const ca = await taoCa(['08:00', '12:00']);
  const u = `/api/nhan-su/ca-lam-viec/${ca.ma_ca}`;
  const r1 = await goi('patch', u).send({ ten_ca: `TEST_LICH_${dot}_moi` });
  assert.equal(r1.status, 200); assert.equal(r1.body.data.thoi_gian_bat_dau, '08:00:00');
  assert.equal((await goi('patch', u, 'quanly').send({ thoi_gian_ket_thuc: '15:00' })).body.data.thoi_gian_ket_thuc, '15:00:00');
  assert.equal((await goi('patch', u).send({ thoi_gian_bat_dau: '15:00' })).status, 400); // = kết thúc hiện tại
  assert.equal((await goi('patch', u).send({ thoi_gian_ket_thuc: '07:00' })).status, 400); // < bắt đầu hiện tại
  assert.equal((await goi('patch', u).send({})).status, 400);
  assert.equal((await goi('patch', u).send({ thoi_gian_bat_dau: '06:00', thoi_gian_ket_thuc: '07:00' })).status, 200);
  assert.equal((await goi('patch', '/api/nhan-su/ca-lam-viec/99999999').send({ ten_ca: 'x' })).status, 404);
  const [[r]] = await pool.query('SELECT TIME_FORMAT(thoi_gian_bat_dau,"%H:%i:%s") b, TIME_FORMAT(thoi_gian_ket_thuc,"%H:%i:%s") k FROM CaLamViec WHERE ma_ca=?', [ca.ma_ca]);
  assert.deepEqual([r.b, r.k], ['06:00:00', '07:00:00']);
});
test('NS-04 xóa ca: ca trống xóa được; ca có phân công → 409 CA_DA_CO_PHAN_CONG; 404', async () => {
  const trong = await taoCa();
  const x = await goi('delete', `/api/nhan-su/ca-lam-viec/${trong.ma_ca}`, 'quanly');
  assert.equal(x.status, 200); assert.deepEqual(x.body.data, { ma_ca: trong.ma_ca, da_xoa: true });
  assert.equal((await goi('get', `/api/nhan-su/ca-lam-viec/${trong.ma_ca}`)).status, 404);
  assert.equal((await goi('delete', `/api/nhan-su/ca-lam-viec/${trong.ma_ca}`)).status, 404);

  const ca = await taoCa(); const nv = await taoNv();
  await xep({ ma_nhan_vien: nv.ma_nhan_vien, ma_ca: ca.ma_ca, ngay_lam: HOM_NAY });
  const r = await goi('delete', `/api/nhan-su/ca-lam-viec/${ca.ma_ca}`);
  assert.equal(r.status, 409); assert.equal(r.body.loi, 'CA_DA_CO_PHAN_CONG');
  assert.equal((await goi('get', `/api/nhan-su/ca-lam-viec/${ca.ma_ca}`)).status, 200);
});
test('NS-04 song song: xóa ca >< xếp lịch → không để lại phân công mồ côi, kết quả nhất quán', async () => {
  for (let i = 0; i < 6; i++) {
    const ca = await taoCa(); const nv = await taoNv();
    const [x, d] = await Promise.all([
      xep({ ma_nhan_vien: nv.ma_nhan_vien, ma_ca: ca.ma_ca, ngay_lam: cong(HOM_NAY, 3) }),
      goi('delete', `/api/nhan-su/ca-lam-viec/${ca.ma_ca}`),
    ]);
    assert.ok([201, 404].includes(x.status), `xếp ${x.status} ${JSON.stringify(x.body)}`);
    assert.ok([200, 409].includes(d.status), `xóa ${d.status} ${JSON.stringify(d.body)}`);
    const [[{ n }]] = await pool.query('SELECT COUNT(*) n FROM CaLamViec WHERE ma_ca=?', [ca.ma_ca]);
    const pc = await dem_pc(nv.ma_nhan_vien, ca.ma_ca);
    if (d.status === 200) { assert.equal(x.status, 404); assert.equal(n, 0); assert.equal(pc, 0); } else { assert.equal(x.status, 201); assert.equal(n, 1); assert.equal(pc, 1); }
  }
});

// ---------------- NS-05 ----------------
test('NS-05 xếp một ngày (chuỗi) và nhiều ngày (mảng): 201, trả danh sách phân công theo ngày', async () => {
  const ca = await taoCa(['07:00', '11:00']); const nv = await taoNv();
  const r1 = await xep({ ma_nhan_vien: nv.ma_nhan_vien, ma_ca: ca.ma_ca, ngay_lam: cong(HOM_NAY, 1) }, 'quanly');
  assert.equal(r1.status, 201, JSON.stringify(r1.body));
  assert.equal(r1.body.data.length, 1);
  assert.equal(r1.body.data[0].ngay_lam, cong(HOM_NAY, 1)); assert.equal(r1.body.data[0].ma_ca, ca.ma_ca); assert.equal(r1.body.data[0].ten_ca, ca.ten_ca);
  const r2 = await xep({ ma_nhan_vien: nv.ma_nhan_vien, ma_ca: ca.ma_ca, ngay_lam: [cong(HOM_NAY, 5), HOM_NAY, cong(HOM_NAY, 3)] });
  assert.equal(r2.status, 201);
  assert.deepEqual(r2.body.data.map(x => x.ngay_lam), [HOM_NAY, cong(HOM_NAY, 3), cong(HOM_NAY, 5)]);
  assert.equal(await dem_pc(nv.ma_nhan_vien, ca.ma_ca), 4);
});
test('NS-05 một nhân viên nhiều ca cùng ngày được (ca khác nhau); chỉ trùng (nv, ca, ngày) mới bị chặn', async () => {
  const c1 = await taoCa(['07:00', '09:00']); const c2 = await taoCa(['09:00', '11:00']); const nv = await taoNv();
  assert.equal((await xep({ ma_nhan_vien: nv.ma_nhan_vien, ma_ca: c1.ma_ca, ngay_lam: HOM_NAY })).status, 201);
  assert.equal((await xep({ ma_nhan_vien: nv.ma_nhan_vien, ma_ca: c2.ma_ca, ngay_lam: HOM_NAY })).status, 201);
});
test('NS-05 trùng → 409 DA_XEP_LICH all-or-nothing, nêu ngày trùng', async () => {
  const ca = await taoCa(); const nv = await taoNv();
  const b = { ma_nhan_vien: nv.ma_nhan_vien, ma_ca: ca.ma_ca };
  await xep({ ...b, ngay_lam: cong(HOM_NAY, 2) });
  const r = await xep({ ...b, ngay_lam: [cong(HOM_NAY, 1), cong(HOM_NAY, 2), cong(HOM_NAY, 4)] });
  assert.equal(r.status, 409); assert.equal(r.body.loi, 'DA_XEP_LICH');
  assert.deepEqual(r.body.chi_tiet.ngay_da_xep, [cong(HOM_NAY, 2)]);
  assert.equal(await dem_pc(nv.ma_nhan_vien, ca.ma_ca), 1, 'không ghi phần nào');
  assert.equal((await xep({ ...b, ngay_lam: cong(HOM_NAY, 2) })).status, 409);
});
test('NS-05 validate: ngày sai/rỗng/trùng trong mảng/>62/quá khứ, thiếu trường, trường lạ', async () => {
  const ca = await taoCa(); const nv = await taoNv();
  const b = { ma_nhan_vien: nv.ma_nhan_vien, ma_ca: ca.ma_ca, ngay_lam: HOM_NAY };
  const nhieu = Array.from({ length: 63 }, (_, i) => cong(HOM_NAY, i + 1));
  for (const x of [
    { ...b, ngay_lam: '2026-02-30' }, { ...b, ngay_lam: '11/10/2026' }, { ...b, ngay_lam: [] }, { ...b, ngay_lam: [HOM_NAY, HOM_NAY] },
    { ...b, ngay_lam: nhieu }, { ...b, ngay_lam: undefined }, { ...b, ma_ca: undefined }, { ...b, ma_nhan_vien: 'a' }, { ...b, ma_nhan_vien: 0 }, { ...b, la: 1 },
    { ...b, ngay_lam: cong(HOM_NAY, -1) }, { ...b, ngay_lam: [cong(HOM_NAY, 1), cong(HOM_NAY, -3)] },
  ]) {
    const r = await xep(x);
    assert.equal(r.status, 400, JSON.stringify(x).slice(0, 120) + JSON.stringify(r.body));
  }
  assert.equal(await dem_pc(nv.ma_nhan_vien, ca.ma_ca), 0);
  assert.equal((await xep({ ...b, ngay_lam: nhieu.slice(0, 62) })).status, 201);
});
test('NS-05 hôm nay được xếp, hôm qua bị từ chối (so với ngày DB)', async () => {
  const ca = await taoCa(); const nv = await taoNv();
  assert.equal((await xep({ ma_nhan_vien: nv.ma_nhan_vien, ma_ca: ca.ma_ca, ngay_lam: HOM_NAY })).status, 201);
  const r = await xep({ ma_nhan_vien: nv.ma_nhan_vien, ma_ca: ca.ma_ca, ngay_lam: cong(HOM_NAY, -1) });
  assert.equal(r.status, 400);
});
test('NS-05 404 nhân viên/ca; 409 NHAN_VIEN_NGHI_VIEC; quyền', async () => {
  const ca = await taoCa(); const nv = await taoNv();
  assert.equal((await xep({ ma_nhan_vien: 99999999, ma_ca: ca.ma_ca, ngay_lam: HOM_NAY })).status, 404);
  assert.equal((await xep({ ma_nhan_vien: nv.ma_nhan_vien, ma_ca: 99999999, ngay_lam: HOM_NAY })).status, 404);
  assert.equal((await xep({ ma_nhan_vien: nv.ma_nhan_vien, ma_ca: ca.ma_ca, ngay_lam: HOM_NAY }, 'nhanvien')).status, 403);
  assert.equal((await xep({ ma_nhan_vien: nv.ma_nhan_vien, ma_ca: ca.ma_ca, ngay_lam: HOM_NAY }, null)).status, 401);
  await pool.query("UPDATE NhanVien SET trang_thai='nghi_viec' WHERE ma_nhan_vien=?", [nv.ma_nhan_vien]);
  const r = await xep({ ma_nhan_vien: nv.ma_nhan_vien, ma_ca: ca.ma_ca, ngay_lam: HOM_NAY });
  assert.equal(r.status, 409); assert.equal(r.body.loi, 'NHAN_VIEN_NGHI_VIEC');
  assert.equal(await dem_pc(nv.ma_nhan_vien, ca.ma_ca), 0);
});
test('NS-05 song song: cùng (nv, ca, ngày) → đúng 1 thành công, còn lại 409', async () => {
  const ca = await taoCa(); const nv = await taoNv();
  const rs = await Promise.all(Array.from({ length: 6 }, () => xep({ ma_nhan_vien: nv.ma_nhan_vien, ma_ca: ca.ma_ca, ngay_lam: [cong(HOM_NAY, 1), cong(HOM_NAY, 2)] })));
  const s = rs.map(r => r.status).sort();
  assert.deepEqual(s, [201, 409, 409, 409, 409, 409], JSON.stringify(rs.map(r => r.body)));
  assert.equal(await dem_pc(nv.ma_nhan_vien, ca.ma_ca), 2);
});
test('NS-05 song song: xếp lịch >< cho nghỉ việc (NS-03) → không còn phân công tương lai của người đã nghỉ', async () => {
  for (let i = 0; i < 5; i++) {
    const ca = await taoCa(); const nv = await taoNv();
    // cho nghỉ việc bằng PATCH không có; dùng DELETE (nhân viên mới tinh sẽ bị XÓA hẳn nếu chưa có lịch sử) => tạo lịch sử trước bằng phân công quá khứ
    await pool.query('INSERT INTO PhanCong (ma_nhan_vien, ma_ca, ngay_lam) VALUES (?,?,?)', [nv.ma_nhan_vien, ca.ma_ca, cong(HOM_NAY, -3)]);
    const [x, d] = await Promise.all([
      xep({ ma_nhan_vien: nv.ma_nhan_vien, ma_ca: ca.ma_ca, ngay_lam: cong(HOM_NAY, 2) }),
      goi('delete', `/api/nhan-su/${nv.ma_nhan_vien}`),
    ]);
    assert.equal(d.status, 200, JSON.stringify(d.body));
    assert.equal(d.body.data.da_xoa, false);
    assert.ok([201, 409].includes(x.status), `${x.status} ${JSON.stringify(x.body)}`);
    const tuongLai = (await pool.query('SELECT COUNT(*) n FROM PhanCong WHERE ma_nhan_vien=? AND ngay_lam >= CURDATE()', [nv.ma_nhan_vien]))[0][0].n;
    assert.equal(tuongLai, 0, 'người nghỉ việc không được còn lịch tương lai');
  }
});

// ---------------- NS-06 ----------------
test('NS-06 gỡ phân công: 200, mất khỏi DB; lần 2 → 404; chỉ gỡ đúng bản ghi', async () => {
  const c1 = await taoCa(); const c2 = await taoCa(); const nv = await taoNv();
  await xep({ ma_nhan_vien: nv.ma_nhan_vien, ma_ca: c1.ma_ca, ngay_lam: [HOM_NAY, cong(HOM_NAY, 1)] });
  await xep({ ma_nhan_vien: nv.ma_nhan_vien, ma_ca: c2.ma_ca, ngay_lam: HOM_NAY });
  const q = `ma_nhan_vien=${nv.ma_nhan_vien}&ma_ca=${c1.ma_ca}&ngay_lam=${HOM_NAY}`;
  const r = await goi('delete', `/api/nhan-su/phan-cong?${q}`, 'quanly');
  assert.equal(r.status, 200); assert.deepEqual(r.body.data, { da_xoa: true });
  assert.equal(await dem_pc(nv.ma_nhan_vien, c1.ma_ca), 1);
  assert.equal(await dem_pc(nv.ma_nhan_vien, c2.ma_ca), 1);
  assert.equal((await goi('delete', `/api/nhan-su/phan-cong?${q}`)).status, 404);
});
test('NS-06 gỡ được cả ngày đã qua; validate query; quyền', async () => {
  const ca = await taoCa(); const nv = await taoNv();
  const qua = cong(HOM_NAY, -10);
  await pool.query('INSERT INTO PhanCong (ma_nhan_vien, ma_ca, ngay_lam) VALUES (?,?,?)', [nv.ma_nhan_vien, ca.ma_ca, qua]);
  const q = `ma_nhan_vien=${nv.ma_nhan_vien}&ma_ca=${ca.ma_ca}&ngay_lam=${qua}`;
  assert.equal((await goi('delete', `/api/nhan-su/phan-cong?${q}`, 'nhanvien')).status, 403);
  assert.equal((await goi('delete', `/api/nhan-su/phan-cong?${q}`, null)).status, 401);
  for (const bad of ['', `ma_nhan_vien=${nv.ma_nhan_vien}&ma_ca=${ca.ma_ca}`, `ma_nhan_vien=x&ma_ca=${ca.ma_ca}&ngay_lam=${qua}`, `ma_nhan_vien=${nv.ma_nhan_vien}&ma_ca=${ca.ma_ca}&ngay_lam=2026-13-01`]) {
    assert.equal((await goi('delete', `/api/nhan-su/phan-cong?${bad}`)).status, 400, bad);
  }
  assert.equal(await dem_pc(nv.ma_nhan_vien, ca.ma_ca), 1);
  assert.equal((await goi('delete', `/api/nhan-su/phan-cong?${q}`)).status, 200);
  assert.equal(await dem_pc(nv.ma_nhan_vien, ca.ma_ca), 0);
});

// ---------------- NS-07 ----------------
test('NS-07 lịch tuần: cửa sổ 7 ngày [thứ Hai, Chủ nhật], sắp theo ngày rồi giờ ca, A/Q xem được người khác', async () => {
  const sang = await taoCa(['06:00', '10:00']); const chieu = await taoCa(['14:00', '18:00']); const nv = await taoNv();
  const tu = cong(THU_HAI, 14); // tuần sau nữa: không đụng dữ liệu mẫu
  const b = { ma_nhan_vien: nv.ma_nhan_vien };
  await xep({ ...b, ma_ca: chieu.ma_ca, ngay_lam: [tu, cong(tu, 6)] });
  await xep({ ...b, ma_ca: sang.ma_ca, ngay_lam: [tu, cong(tu, 1), cong(tu, 7), cong(tu, -1)] });
  const r = await goi('get', `/api/nhan-su/lich-tuan?tu_ngay=${tu}&ma_nhan_vien=${nv.ma_nhan_vien}`, 'quanly');
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.tu_ngay, tu); assert.equal(r.body.den_ngay, cong(tu, 6));
  assert.deepEqual(r.body.data.map(x => [x.ngay_lam, x.ma_ca]), [[tu, sang.ma_ca], [tu, chieu.ma_ca], [cong(tu, 1), sang.ma_ca], [cong(tu, 6), chieu.ma_ca]]);
  const x = r.body.data[0];
  assert.equal(x.ma_nhan_vien, nv.ma_nhan_vien); assert.equal(x.ho_ten, nv.ho_ten); assert.equal(x.ten_ca, sang.ten_ca);
  assert.equal(x.thoi_gian_bat_dau, '06:00:00'); assert.equal(x.thoi_gian_ket_thuc, '10:00:00');
  assert.equal((await goi('get', `/api/nhan-su/lich-tuan?tu_ngay=${tu}&ma_nhan_vien=${nv.ma_nhan_vien}`)).status, 200);
});
test('NS-07 A/Q không truyền ma_nhan_vien → thấy nhiều người', async () => {
  const ca = await taoCa(); const n1 = await taoNv(); const n2 = await taoNv();
  const tu = cong(THU_HAI, 21);
  await xep({ ma_nhan_vien: n1.ma_nhan_vien, ma_ca: ca.ma_ca, ngay_lam: tu });
  await xep({ ma_nhan_vien: n2.ma_nhan_vien, ma_ca: ca.ma_ca, ngay_lam: tu });
  const r = await goi('get', `/api/nhan-su/lich-tuan?tu_ngay=${tu}`);
  const cua = r.body.data.filter(x => x.ma_ca === ca.ma_ca).map(x => x.ma_nhan_vien).sort();
  assert.deepEqual(cua, [n1.ma_nhan_vien, n2.ma_nhan_vien].sort());
});
test('NS-07 nhân viên chỉ xem lịch của mình: mặc định là mình; xin người khác → 403', async () => {
  const ca = await taoCa(); const me = await taoNv(); const nguoiKhac = await taoNv();
  const tu = cong(THU_HAI, 28);
  await xep({ ma_nhan_vien: me.ma_nhan_vien, ma_ca: ca.ma_ca, ngay_lam: tu });
  await xep({ ma_nhan_vien: nguoiKhac.ma_nhan_vien, ma_ca: ca.ma_ca, ngay_lam: tu });
  const tk = await tokenCua(me);
  const r = await goi('get', `/api/nhan-su/lich-tuan?tu_ngay=${tu}`, tk);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.data.map(x => x.ma_nhan_vien), [me.ma_nhan_vien]);
  assert.equal((await goi('get', `/api/nhan-su/lich-tuan?tu_ngay=${tu}&ma_nhan_vien=${me.ma_nhan_vien}`, tk)).body.data.length, 1);
  const k = await goi('get', `/api/nhan-su/lich-tuan?tu_ngay=${tu}&ma_nhan_vien=${nguoiKhac.ma_nhan_vien}`, tk);
  assert.equal(k.status, 403);
  assert.equal((await goi('get', `/api/nhan-su/lich-tuan?tu_ngay=${tu}`, null)).status, 401);
});
test('NS-07 tu_ngay phải là thứ Hai; mặc định = thứ Hai tuần hiện tại; validate', async () => {
  const nv = await taoNv(); const ca = await taoCa();
  for (const bad of [cong(THU_HAI, 1), cong(THU_HAI, 6), '2026-02-30', 'abc']) {
    assert.equal((await goi('get', `/api/nhan-su/lich-tuan?tu_ngay=${bad}`)).status, 400, bad);
  }
  assert.equal((await goi('get', '/api/nhan-su/lich-tuan?ma_nhan_vien=abc')).status, 400);
  await xep({ ma_nhan_vien: nv.ma_nhan_vien, ma_ca: ca.ma_ca, ngay_lam: HOM_NAY });
  const r = await goi('get', `/api/nhan-su/lich-tuan?ma_nhan_vien=${nv.ma_nhan_vien}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.tu_ngay, THU_HAI); assert.equal(r.body.den_ngay, cong(THU_HAI, 6));
  assert.deepEqual(r.body.data.map(x => x.ngay_lam), [HOM_NAY]);
  const rong = await goi('get', `/api/nhan-su/lich-tuan?tu_ngay=${cong(THU_HAI, 700)}&ma_nhan_vien=${nv.ma_nhan_vien}`);
  assert.equal(rong.status, 200); assert.deepEqual(rong.body.data, []);
});
test('NS-07 gỡ phân công rồi lịch tuần không còn dòng đó; nhân viên nghỉ việc vẫn thấy lịch quá khứ', async () => {
  const ca = await taoCa(); const nv = await taoNv();
  const tu = cong(THU_HAI, 35);
  await xep({ ma_nhan_vien: nv.ma_nhan_vien, ma_ca: ca.ma_ca, ngay_lam: [tu, cong(tu, 2)] });
  await goi('delete', `/api/nhan-su/phan-cong?ma_nhan_vien=${nv.ma_nhan_vien}&ma_ca=${ca.ma_ca}&ngay_lam=${tu}`);
  const r = await goi('get', `/api/nhan-su/lich-tuan?tu_ngay=${tu}&ma_nhan_vien=${nv.ma_nhan_vien}`);
  assert.deepEqual(r.body.data.map(x => x.ngay_lam), [cong(tu, 2)]);
});
