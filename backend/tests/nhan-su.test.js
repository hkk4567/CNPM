// Test 9a – module nhan-su: NS-01 tạo nhân viên + tài khoản, NS-02 sửa/đổi quyền, NS-03 xóa/cho nghỉ việc, danh sách/chi tiết.
// Dữ liệu riêng: nhân viên TEST_NS_*, tài khoản tns_* . KHÔNG đụng 3 tài khoản mẫu (file khác đăng nhập bằng chúng); các thao tác "hạ quyền admin cuối"
// chỉ thử trên admin mẫu khi chắc chắn bị TỪ CHỐI (409). (NS-04..NS-07 ở tests/nhan-su-lich.test.js, bước 9b.)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'khoa-chi-dung-cho-test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const pool = require('../src/config/db');
const { taoApp } = require('../src/app');

const app = taoApp();
const token = {};
const dot = `${Date.now()}`.slice(-8);
let dem = 0; let maAdminMau; let maCaTest;
const MK = 'Mkdau1234';
const tenDn = () => `tns_${dot}_${dem++}`;

const goi = (pt, duong, nguoi = 'admin') => {
  const r = request(app)[pt](duong);
  return nguoi ? r.set('Authorization', `Bearer ${nguoi.startsWith('eyJ') ? nguoi : token[nguoi]}`) : r;
};
const dangNhap = (ten, mk = MK) => request(app).post('/api/auth/dang-nhap').send({ ten_dang_nhap: ten, mat_khau: mk });
const moi = (ghiDe = {}) => ({ ho_ten: `TEST_NS_${dot}_${dem++}`, chuc_vu: 'Pha chế', ten_dang_nhap: tenDn(), mat_khau: MK, quyen_truy_cap: 'nhan_vien', ...ghiDe });
async function taoNv(ghiDe = {}, nguoi = 'admin') {
  const b = moi(ghiDe);
  const res = await goi('post', '/api/nhan-su', nguoi).send(b);
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { ...res.body.data, mat_khau: b.mat_khau };
}
async function tokenCua(nv) {
  const r = await dangNhap(nv.ten_dang_nhap, nv.mat_khau || MK);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.data.token;
}
const demTheoHoTen = async ten => (await pool.query('SELECT COUNT(*) AS n FROM NhanVien WHERE ho_ten = ?', [ten]))[0][0].n;
const demAdmin = async () => (await pool.query("SELECT COUNT(*) AS n FROM TaiKhoan tk JOIN NhanVien nv ON nv.ma_nhan_vien = tk.ma_nhan_vien WHERE tk.quyen_truy_cap = 'admin' AND nv.trang_thai = 'dang_lam'"))[0][0].n;

async function donDep() {
  const [nv] = await pool.query("SELECT ma_nhan_vien FROM NhanVien WHERE ho_ten LIKE 'TEST\\_NS\\_%'");
  const ids = nv.map(r => r.ma_nhan_vien);
  if (ids.length) {
    await pool.query('DELETE FROM HoaDon WHERE ma_nhan_vien IN (?)', [ids]);
    await pool.query('DELETE c FROM ChiTietNhap c JOIN PhieuNhap p ON p.ma_phieu_nhap = c.ma_phieu_nhap WHERE p.ma_nhan_vien IN (?)', [ids]);
    await pool.query('DELETE FROM PhieuNhap WHERE ma_nhan_vien IN (?)', [ids]);
    await pool.query('DELETE FROM PhanCong WHERE ma_nhan_vien IN (?)', [ids]);
    await pool.query('DELETE FROM TaiKhoan WHERE ma_nhan_vien IN (?)', [ids]);
    await pool.query('DELETE FROM NhanVien WHERE ma_nhan_vien IN (?)', [ids]);
  }
  await pool.query("DELETE FROM NhaCungCap WHERE ten_ncc LIKE 'TEST\\_NS\\_%'");
  await pool.query("DELETE FROM CaLamViec WHERE ten_ca LIKE 'TEST\\_NS\\_%'");
}
before(async () => {
  await donDep();
  for (const [t, mk] of [['admin', 'Admin@123'], ['quanly', 'Quanly@123'], ['nhanvien', 'Nhanvien@123']]) {
    const res = await request(app).post('/api/auth/dang-nhap').send({ ten_dang_nhap: t, mat_khau: mk });
    token[t] = res.body.data.token;
  }
  maAdminMau = (await pool.query("SELECT ma_nhan_vien FROM TaiKhoan WHERE ten_dang_nhap = 'admin'"))[0][0].ma_nhan_vien;
  maCaTest = (await pool.query("INSERT INTO CaLamViec (ten_ca, thoi_gian_bat_dau, thoi_gian_ket_thuc) VALUES ('TEST_NS_CA', '07:00:00', '09:00:00')"))[0].insertId;
});
after(async () => { await donDep(); await pool.end(); });

// ---------- NS-01 ----------
test('NS-01: admin tạo nhân viên + tài khoản trong một transaction; đăng nhập được ngay; không lộ mật khẩu/băm', async () => {
  const b = moi({ so_dien_thoai: '0901234567', quyen_truy_cap: 'quan_ly' });
  const res = await goi('post', '/api/nhan-su').send({ ...b, ho_ten: `  ${b.ho_ten}  ` });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const d = res.body.data;
  assert.ok(Number.isInteger(d.ma_nhan_vien) && Number.isInteger(d.ma_tai_khoan));
  assert.deepEqual([d.ho_ten, d.chuc_vu, d.so_dien_thoai, d.ten_dang_nhap, d.quyen_truy_cap, d.trang_thai],
    [b.ho_ten, 'Pha chế', '0901234567', b.ten_dang_nhap, 'quan_ly', 'dang_lam']);
  assert.ok(!/mat_khau|hash/i.test(JSON.stringify(res.body)));
  const dn = await dangNhap(b.ten_dang_nhap);
  assert.equal(dn.status, 200);
  assert.equal(dn.body.data.nguoi_dung.quyen_truy_cap, 'quan_ly');
  const [[tk]] = await pool.query('SELECT mat_khau_hash FROM TaiKhoan WHERE ma_tai_khoan = ?', [d.ma_tai_khoan]);
  assert.ok(tk.mat_khau_hash.startsWith('$2') && tk.mat_khau_hash !== MK, 'mật khẩu được băm bcrypt');
  const khongSdt = await taoNv();
  assert.equal(khongSdt.so_dien_thoai, null);
});

test('NS-01: chỉ admin; quản lý/nhân viên 403, chưa đăng nhập 401; không tạo gì', async () => {
  const b = moi();
  assert.equal((await goi('post', '/api/nhan-su', 'quanly').send(b)).status, 403);
  assert.equal((await goi('post', '/api/nhan-su', 'nhanvien').send(b)).status, 403);
  assert.equal((await goi('post', '/api/nhan-su', null).send(b)).status, 401);
  assert.equal(await demTheoHoTen(b.ho_ten), 0);
});

test('NS-01: đầu vào sai 400 (mật khẩu yếu, tên đăng nhập sai, quyền sai, trường lạ...); trùng tên đăng nhập 409 và KHÔNG để lại nhân viên mồ côi', async () => {
  const sai = [
    { ho_ten: '' }, { chuc_vu: '' }, { ho_ten: 'x'.repeat(101) }, { chuc_vu: 'x'.repeat(51) }, { so_dien_thoai: '123' }, { so_dien_thoai: '0abc456789' },
    { ten_dang_nhap: 'ab' }, { ten_dang_nhap: 'co dau cach' }, { ten_dang_nhap: 'tiếng_việt' }, { ten_dang_nhap: 'x'.repeat(51) },
    { mat_khau: 'Ab1' }, { mat_khau: 'abcdefgh' }, { mat_khau: '12345678' }, { mat_khau: 'a'.repeat(73) + '1' },
    { quyen_truy_cap: 'sieu_admin' }, { quyen_truy_cap: undefined }, { truong_la: 1 }, { trang_thai: 'nghi_viec' }, { ma_nhan_vien: 5 },
  ];
  for (const g of sai) {
    const b = moi(g);
    const r = await goi('post', '/api/nhan-su').send(b);
    assert.equal(r.status, 400, JSON.stringify(g));
    assert.equal(await demTheoHoTen(b.ho_ten), 0, `không tạo nhân viên khi lỗi: ${JSON.stringify(g)}`);
  }
  assert.equal((await goi('post', '/api/nhan-su').send({})).status, 400);
  const goc = await taoNv();
  for (const t of [goc.ten_dang_nhap, goc.ten_dang_nhap.toUpperCase()]) {
    const b = moi({ ten_dang_nhap: t });
    const r = await goi('post', '/api/nhan-su').send(b);
    assert.equal(r.status, 409, t); assert.equal(r.body.loi, 'TRUNG_TEN_DANG_NHAP');
    assert.equal(await demTheoHoTen(b.ho_ten), 0, 'transaction hoàn tác cả NhanVien');
  }
  assert.equal((await goi('post', '/api/nhan-su').send(moi({ ten_dang_nhap: 'admin' }))).status, 409);
});

test('NS-01 đồng thời: 6 yêu cầu cùng tên đăng nhập -> đúng một 201, còn lại 409; không nhân viên mồ côi, không 500', async () => {
  for (let v = 0; v < 6; v++) {
    const ten = tenDn();
    const bs = Array.from({ length: 6 }, () => moi({ ten_dang_nhap: ten }));
    const rs = await Promise.all(bs.map(b => goi('post', '/api/nhan-su').send(b)));
    assert.deepEqual(rs.map(r => r.status).sort(), [201, 409, 409, 409, 409, 409], JSON.stringify(rs.map(r => r.body)));
    const tong = (await Promise.all(bs.map(b => demTheoHoTen(b.ho_ten)))).reduce((a, n) => a + n, 0);
    assert.equal(tong, 1);
  }
});

// ---------- danh sách / chi tiết ----------
test('danh sách và chi tiết nhân viên: A/Q xem được (nhân viên 403); tìm theo tên/SĐT/tên đăng nhập; lọc; phân trang; không lộ băm', async () => {
  const tienTo = `TEST_NS_${dot}_LS`;
  const a = await taoNv({ ho_ten: `${tienTo}_a`, quyen_truy_cap: 'quan_ly', so_dien_thoai: '0988777666' });
  const b = await taoNv({ ho_ten: `${tienTo}_b` }); await taoNv({ ho_ten: `${tienTo}_c` });
  const ds = await goi('get', `/api/nhan-su?tu_khoa=${encodeURIComponent(tienTo)}&moi_trang=2&trang=1`, 'quanly');
  assert.equal(ds.status, 200);
  assert.deepEqual([ds.body.tong_so_ban_ghi, ds.body.data.length, ds.body.trang, ds.body.moi_trang], [3, 2, 1, 2]);
  assert.ok(!/hash/i.test(JSON.stringify(ds.body)));
  assert.equal((await goi('get', `/api/nhan-su?tu_khoa=${encodeURIComponent(tienTo)}&quyen_truy_cap=quan_ly`)).body.data[0].ma_nhan_vien, a.ma_nhan_vien);
  assert.equal((await goi('get', '/api/nhan-su?tu_khoa=0988777666')).body.data.some(x => x.ma_nhan_vien === a.ma_nhan_vien), true);
  assert.equal((await goi('get', `/api/nhan-su?tu_khoa=${b.ten_dang_nhap}`)).body.data[0].ma_nhan_vien, b.ma_nhan_vien);
  assert.equal((await goi('get', `/api/nhan-su?tu_khoa=${encodeURIComponent(tienTo)}&trang_thai=nghi_viec`)).body.tong_so_ban_ghi, 0);
  const ct = await goi('get', `/api/nhan-su/${a.ma_nhan_vien}`, 'quanly');
  assert.equal(ct.body.data.ten_dang_nhap, a.ten_dang_nhap);
  assert.equal((await goi('get', '/api/nhan-su/999999999')).status, 404);
  assert.equal((await goi('get', '/api/nhan-su/abc')).status, 400);
  for (const q of ['?trang_thai=x', '?quyen_truy_cap=x', '?moi_trang=0', '?moi_trang=101', '?tu_khoa=']) assert.equal((await goi('get', `/api/nhan-su${q}`)).status, 400, q);
  assert.equal((await goi('get', '/api/nhan-su', 'nhanvien')).status, 403);
  assert.equal((await goi('get', `/api/nhan-su/${a.ma_nhan_vien}`, 'nhanvien')).status, 403);
  // nhân viên nghỉ việc không có tài khoản (dữ liệu mẫu) vẫn liệt kê được, tài khoản null
  const nghi = (await goi('get', '/api/nhan-su?trang_thai=nghi_viec&moi_trang=100')).body.data;
  assert.ok(nghi.every(x => x.trang_thai === 'nghi_viec'));
});

// ---------- NS-02 ----------
test('NS-02: admin sửa thông tin từng phần; null xóa SĐT; trường không gửi giữ nguyên', async () => {
  const nv = await taoNv({ so_dien_thoai: '0911222333' });
  const a = await goi('patch', `/api/nhan-su/${nv.ma_nhan_vien}`).send({ chuc_vu: '  Thu ngân ' });
  assert.equal(a.status, 200, JSON.stringify(a.body));
  assert.deepEqual([a.body.data.chuc_vu, a.body.data.ho_ten, a.body.data.so_dien_thoai], ['Thu ngân', nv.ho_ten, '0911222333']);
  const b = await goi('patch', `/api/nhan-su/${nv.ma_nhan_vien}`).send({ so_dien_thoai: null, ho_ten: `${nv.ho_ten}_moi` });
  assert.deepEqual([b.body.data.so_dien_thoai, b.body.data.ho_ten], [null, `${nv.ho_ten}_moi`]);
  assert.equal(b.body.data.quyen_truy_cap, 'nhan_vien');
  for (const body of [{}, { ho_ten: '' }, { so_dien_thoai: '12' }, { trang_thai: 'nghi_viec' }, { ten_dang_nhap: 'doi_ten' }, { ma_nhan_vien: 9 }, { quyen_truy_cap: 'x' }, { mat_khau: 'yeu' }]) {
    assert.equal((await goi('patch', `/api/nhan-su/${nv.ma_nhan_vien}`).send(body)).status, 400, JSON.stringify(body));
  }
  assert.equal((await goi('patch', '/api/nhan-su/999999999').send({ chuc_vu: 'x' })).status, 404);
  assert.equal((await goi('patch', '/api/nhan-su/abc').send({ chuc_vu: 'x' })).status, 400);
  assert.equal((await goi('patch', `/api/nhan-su/${nv.ma_nhan_vien}`, 'nhanvien').send({ chuc_vu: 'x' })).status, 403);
  assert.equal((await goi('patch', `/api/nhan-su/${nv.ma_nhan_vien}`, null).send({ chuc_vu: 'x' })).status, 401);
});

test('NS-02: quản lý chỉ sửa thông tin nhân viên/quản lý; KHÔNG đổi quyền, KHÔNG đặt lại mật khẩu, KHÔNG đụng tài khoản admin', async () => {
  const nv = await taoNv(); const ql = await taoNv({ quyen_truy_cap: 'quan_ly' }); const ad = await taoNv({ quyen_truy_cap: 'admin' });
  assert.equal((await goi('patch', `/api/nhan-su/${nv.ma_nhan_vien}`, 'quanly').send({ chuc_vu: 'Do quan ly sua' })).status, 200);
  assert.equal((await goi('patch', `/api/nhan-su/${ql.ma_nhan_vien}`, 'quanly').send({ chuc_vu: 'Dong nghiep' })).status, 200);
  for (const body of [{ quyen_truy_cap: 'quan_ly' }, { quyen_truy_cap: 'nhan_vien' }, { mat_khau: 'Mkmoi12345' }, { chuc_vu: 'x', quyen_truy_cap: 'admin' }]) {
    const r = await goi('patch', `/api/nhan-su/${nv.ma_nhan_vien}`, 'quanly').send(body);
    assert.equal(r.status, 403, JSON.stringify(body));
  }
  const dungAdmin = await goi('patch', `/api/nhan-su/${ad.ma_nhan_vien}`, 'quanly').send({ chuc_vu: 'Chiem quyen' });
  assert.equal(dungAdmin.status, 403);
  assert.equal((await goi('patch', `/api/nhan-su/${maAdminMau}`, 'quanly').send({ chuc_vu: 'Chiem quyen' })).status, 403);
  const [[sau]] = await pool.query('SELECT chuc_vu FROM NhanVien WHERE ma_nhan_vien = ?', [ad.ma_nhan_vien]);
  assert.equal(sau.chuc_vu, 'Pha chế', 'lần bị 403 không được ghi gì');
  assert.equal((await dangNhap(nv.ten_dang_nhap)).status, 200, 'mật khẩu không bị đổi');
  assert.equal((await goi('get', `/api/nhan-su/${nv.ma_nhan_vien}`)).body.data.quyen_truy_cap, 'nhan_vien');
});

test('NS-02: admin đổi quyền có hiệu lực NGAY với token đã cấp; đặt lại mật khẩu thì mật khẩu cũ hết dùng', async () => {
  const nv = await taoNv();
  const tk = await tokenCua(nv);
  assert.equal((await goi('get', '/api/kho/ton-kho', tk)).status, 403);
  const r = await goi('patch', `/api/nhan-su/${nv.ma_nhan_vien}`).send({ quyen_truy_cap: 'quan_ly' });
  assert.equal(r.status, 200); assert.equal(r.body.data.quyen_truy_cap, 'quan_ly');
  assert.equal((await goi('get', '/api/kho/ton-kho', tk)).status, 200, 'cùng token, quyền mới có hiệu lực ngay');
  assert.equal((await goi('patch', `/api/nhan-su/${nv.ma_nhan_vien}`).send({ quyen_truy_cap: 'quan_ly', chuc_vu: 'Cung quyen' })).status, 200, 'đặt lại đúng quyền cũ không lỗi');
  const dat = await goi('patch', `/api/nhan-su/${nv.ma_nhan_vien}`).send({ mat_khau: 'Datlai98765' });
  assert.equal(dat.status, 200);
  assert.ok(!/mat_khau|hash/i.test(JSON.stringify(dat.body)));
  assert.equal((await dangNhap(nv.ten_dang_nhap, MK)).status, 401);
  assert.equal((await dangNhap(nv.ten_dang_nhap, 'Datlai98765')).status, 200);
});

test('NS-02: nhân viên chưa có tài khoản: sửa thông tin được, đổi quyền/mật khẩu 409', async () => {
  const [r] = await pool.query("INSERT INTO NhanVien (ho_ten, chuc_vu) VALUES (?, 'Khong tai khoan')", [`TEST_NS_${dot}_KTK`]);
  const ma = r.insertId;
  assert.equal((await goi('patch', `/api/nhan-su/${ma}`).send({ chuc_vu: 'Moi' })).status, 200);
  for (const body of [{ quyen_truy_cap: 'quan_ly' }, { mat_khau: 'Mkmoi12345' }]) {
    const x = await goi('patch', `/api/nhan-su/${ma}`).send(body);
    assert.equal(x.status, 409, JSON.stringify(body)); assert.equal(x.body.loi, 'NHAN_VIEN_KHONG_CO_TAI_KHOAN');
  }
  assert.equal((await goi('get', `/api/nhan-su/${ma}`)).body.data.ma_tai_khoan, null);
});

test('NS-02: không hạ quyền admin cuối cùng (409); còn admin khác thì tự hạ quyền được', async () => {
  // các test trước để lại vài admin thử nghiệm: hạ họ xuống bằng SQL để chỉ còn admin mẫu
  await pool.query("UPDATE TaiKhoan tk JOIN NhanVien nv ON nv.ma_nhan_vien = tk.ma_nhan_vien SET tk.quyen_truy_cap = 'nhan_vien' WHERE nv.ho_ten LIKE 'TEST\\_NS\\_%'");
  assert.equal(await demAdmin(), 1, 'chỉ còn admin mẫu');
  let r;
  try {
    r = await goi('patch', `/api/nhan-su/${maAdminMau}`).send({ quyen_truy_cap: 'quan_ly' });
  } finally {
    // Nếu mã nguồn có lỗi và việc hạ quyền lọt qua, KHÔNG để admin mẫu bị hạ làm hỏng mọi test khác: khôi phục bằng SQL rồi mới báo lỗi
    await pool.query("UPDATE TaiKhoan SET quyen_truy_cap = 'admin' WHERE ma_nhan_vien = ?", [maAdminMau]);
  }
  assert.equal(r.status, 409); assert.equal(r.body.loi, 'ADMIN_CUOI_CUNG');
  assert.equal((await goi('patch', `/api/nhan-su/${maAdminMau}`).send({ quyen_truy_cap: 'admin', chuc_vu: 'Quản trị hệ thống' })).status, 200, 'đặt lại admin cho admin: không lỗi');
  const x = await taoNv({ quyen_truy_cap: 'admin' });
  const tx = await tokenCua(x);
  assert.equal(await demAdmin(), 2);
  const tuHa = await goi('patch', `/api/nhan-su/${x.ma_nhan_vien}`, tx).send({ quyen_truy_cap: 'quan_ly' });
  assert.equal(tuHa.status, 200, JSON.stringify(tuHa.body));
  assert.equal((await goi('post', '/api/nhan-su', tx).send(moi())).status, 403, 'vừa hạ quyền thì không còn tạo được nhân viên');
  assert.equal(await demAdmin(), 1);
});

test('NS-02 đồng thời: hai admin cùng hạ quyền cho nhau -> luôn còn ít nhất một admin, không 500', async () => {
  for (let v = 0; v < 6; v++) {
    const y = await taoNv({ quyen_truy_cap: 'admin' }); const z = await taoNv({ quyen_truy_cap: 'admin' });
    const [ty, tz] = [await tokenCua(y), await tokenCua(z)];
    const rs = await Promise.all([
      goi('patch', `/api/nhan-su/${z.ma_nhan_vien}`, ty).send({ quyen_truy_cap: 'nhan_vien' }),
      goi('patch', `/api/nhan-su/${y.ma_nhan_vien}`, tz).send({ quyen_truy_cap: 'nhan_vien' }),
    ]);
    for (const r of rs) assert.ok([200, 403, 409].includes(r.status), JSON.stringify(r.body)); // 403 nếu người gọi vừa bị hạ trước đó
    assert.ok((await demAdmin()) >= 1);
  }
});

// ---------- NS-03 ----------
test('NS-03: chưa có lịch sử -> xóa hẳn (kèm tài khoản): { da_xoa: true }; chỉ admin; 404 lần sau', async () => {
  const nv = await taoNv();
  const tk = await tokenCua(nv);
  assert.equal((await goi('delete', `/api/nhan-su/${nv.ma_nhan_vien}`, 'quanly')).status, 403);
  assert.equal((await goi('delete', `/api/nhan-su/${nv.ma_nhan_vien}`, 'nhanvien')).status, 403);
  assert.equal((await goi('delete', `/api/nhan-su/${nv.ma_nhan_vien}`, null)).status, 401);
  const r = await goi('delete', `/api/nhan-su/${nv.ma_nhan_vien}`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body.data, { da_xoa: true });
  assert.equal((await goi('get', `/api/nhan-su/${nv.ma_nhan_vien}`)).status, 404);
  assert.equal((await dangNhap(nv.ten_dang_nhap)).status, 401);
  assert.equal((await goi('get', '/api/auth/toi', tk)).status, 401, 'token cũ mất hiệu lực ngay');
  assert.equal((await goi('delete', `/api/nhan-su/${nv.ma_nhan_vien}`)).status, 404);
  assert.equal((await goi('delete', '/api/nhan-su/abc')).status, 400);
});

test('NS-03: đã có hóa đơn -> KHÔNG xóa, đặt nghi_viec: bị chặn đăng nhập, token cũ vô hiệu, vẫn còn trong dữ liệu; gọi lại vẫn 200', async () => {
  const nv = await taoNv();
  const tk = await tokenCua(nv);
  await pool.query('INSERT INTO HoaDon (ma_nhan_vien, so_thu_tu) VALUES (?, 99991)', [nv.ma_nhan_vien]);
  const r = await goi('delete', `/api/nhan-su/${nv.ma_nhan_vien}`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual([r.body.data.da_xoa, r.body.data.trang_thai, r.body.data.ly_do.hoa_don], [false, 'nghi_viec', true]);
  assert.equal((await goi('get', `/api/nhan-su/${nv.ma_nhan_vien}`)).body.data.trang_thai, 'nghi_viec');
  const dn = await dangNhap(nv.ten_dang_nhap);
  assert.equal(dn.status, 403); assert.equal(dn.body.loi, 'TAI_KHOAN_BI_KHOA');
  assert.equal((await goi('get', '/api/auth/toi', tk)).status, 401);
  assert.equal((await goi('delete', `/api/nhan-su/${nv.ma_nhan_vien}`)).body.data.da_xoa, false, 'gọi lại: idempotent');
  assert.equal((await goi('patch', `/api/nhan-su/${nv.ma_nhan_vien}`).send({ chuc_vu: 'Da nghi' })).status, 200, 'vẫn sửa được hồ sơ');
  const ds = await goi('get', `/api/nhan-su?trang_thai=nghi_viec&tu_khoa=${nv.ten_dang_nhap}`);
  assert.equal(ds.body.tong_so_ban_ghi, 1);
});

test('NS-03: có phiếu nhập hoặc phân công trong quá khứ cũng chỉ cho nghỉ việc', async () => {
  const ncc = (await pool.query("INSERT INTO NhaCungCap (ten_ncc) VALUES (?)", [`TEST_NS_${dot}_NCC`]))[0].insertId;
  const a = await taoNv();
  await pool.query('INSERT INTO PhieuNhap (ma_ncc, ma_nhan_vien, tong_tien_nhap) VALUES (?, ?, 0)', [ncc, a.ma_nhan_vien]);
  const ra = await goi('delete', `/api/nhan-su/${a.ma_nhan_vien}`);
  assert.deepEqual([ra.body.data.da_xoa, ra.body.data.ly_do.phieu_nhap], [false, true]);
  const b = await taoNv();
  await pool.query("INSERT INTO PhanCong (ma_nhan_vien, ma_ca, ngay_lam) VALUES (?, ?, CURDATE() - INTERVAL 3 DAY)", [b.ma_nhan_vien, maCaTest]);
  const rb = await goi('delete', `/api/nhan-su/${b.ma_nhan_vien}`);
  assert.deepEqual([rb.body.data.da_xoa, rb.body.data.ly_do.phan_cong_cu], [false, true]);
  assert.equal((await pool.query('SELECT COUNT(*) AS n FROM PhanCong WHERE ma_nhan_vien = ?', [b.ma_nhan_vien]))[0][0].n, 1, 'lịch sử phân công giữ nguyên');
});

test('NS-03: phân công từ hôm nay trở đi bị gỡ khi nghỉ việc; chỉ có phân công tương lai thì vẫn xóa hẳn được', async () => {
  const a = await taoNv();
  await pool.query("INSERT INTO PhanCong (ma_nhan_vien, ma_ca, ngay_lam) VALUES (?, ?, CURDATE() + INTERVAL 1 DAY), (?, ?, CURDATE())", [a.ma_nhan_vien, maCaTest, a.ma_nhan_vien, maCaTest]);
  const r = await goi('delete', `/api/nhan-su/${a.ma_nhan_vien}`);
  assert.deepEqual(r.body.data, { da_xoa: true });
  assert.equal((await pool.query('SELECT COUNT(*) AS n FROM PhanCong WHERE ma_nhan_vien = ?', [a.ma_nhan_vien]))[0][0].n, 0);

  const b = await taoNv();
  await pool.query('INSERT INTO HoaDon (ma_nhan_vien, so_thu_tu) VALUES (?, 99992)', [b.ma_nhan_vien]);
  await pool.query("INSERT INTO PhanCong (ma_nhan_vien, ma_ca, ngay_lam) VALUES (?, ?, CURDATE() + INTERVAL 2 DAY), (?, ?, CURDATE() - INTERVAL 2 DAY)", [b.ma_nhan_vien, maCaTest, b.ma_nhan_vien, maCaTest]);
  const rb = await goi('delete', `/api/nhan-su/${b.ma_nhan_vien}`);
  assert.deepEqual([rb.body.data.da_xoa, rb.body.data.so_phan_cong_da_go], [false, 1]);
  assert.equal((await pool.query('SELECT COUNT(*) AS n FROM PhanCong WHERE ma_nhan_vien = ? AND ngay_lam >= CURDATE()', [b.ma_nhan_vien]))[0][0].n, 0);
  assert.equal((await pool.query('SELECT COUNT(*) AS n FROM PhanCong WHERE ma_nhan_vien = ?', [b.ma_nhan_vien]))[0][0].n, 1);
});

test('NS-03: không tự xóa chính mình (409); admin mẫu vẫn còn nguyên', async () => {
  const r = await goi('delete', `/api/nhan-su/${maAdminMau}`);
  assert.equal(r.status, 409); assert.equal(r.body.loi, 'KHONG_XOA_CHINH_MINH');
  const x = await taoNv({ quyen_truy_cap: 'admin' });
  const tx = await tokenCua(x);
  const t = await goi('delete', `/api/nhan-su/${x.ma_nhan_vien}`, tx);
  assert.equal(t.status, 409); assert.equal(t.body.loi, 'KHONG_XOA_CHINH_MINH');
  assert.equal((await goi('delete', `/api/nhan-su/${x.ma_nhan_vien}`)).status, 200, 'admin khác xóa được');
  assert.equal((await goi('get', `/api/nhan-su/${maAdminMau}`)).body.data.trang_thai, 'dang_lam');
});

test('NS-03 đồng thời: xóa cùng một nhân viên 5 lần -> đúng một 200 (còn lại 404); nhân viên có lịch sử thì cả 5 đều 200 không 500', async () => {
  for (let v = 0; v < 4; v++) {
    const a = await taoNv();
    const rs = await Promise.all(Array.from({ length: 5 }, () => goi('delete', `/api/nhan-su/${a.ma_nhan_vien}`)));
    assert.deepEqual(rs.map(r => r.status).sort(), [200, 404, 404, 404, 404]);
    const b = await taoNv();
    await pool.query('INSERT INTO HoaDon (ma_nhan_vien, so_thu_tu) VALUES (?, 99993)', [b.ma_nhan_vien]);
    const rb = await Promise.all(Array.from({ length: 5 }, () => goi('delete', `/api/nhan-su/${b.ma_nhan_vien}`)));
    assert.ok(rb.every(r => r.status === 200 && r.body.data.da_xoa === false), JSON.stringify(rb.map(r => r.body)));
  }
});

test('NS-03 đồng thời: hai admin xóa lẫn nhau -> không 500, luôn còn admin', async () => {
  for (let v = 0; v < 5; v++) {
    const y = await taoNv({ quyen_truy_cap: 'admin' }); const z = await taoNv({ quyen_truy_cap: 'admin' });
    const [ty, tz] = [await tokenCua(y), await tokenCua(z)];
    const rs = await Promise.all([goi('delete', `/api/nhan-su/${z.ma_nhan_vien}`, ty), goi('delete', `/api/nhan-su/${y.ma_nhan_vien}`, tz)]);
    for (const r of rs) assert.ok([200, 401, 404, 409].includes(r.status), JSON.stringify(r.body)); // 401: người gọi vừa bị xóa trước
    assert.ok((await demAdmin()) >= 1);
  }
});
