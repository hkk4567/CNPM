// Test AUTH-02 – đổi mật khẩu (A/Q/N, của chính mình; route không phân biệt quyền). Dùng tài khoản RIÊNG (tên đăng nhập tam_dmk_*, nhân viên TEST_DMK_*): không đụng 3 tài khoản mẫu
// vì các file test khác đăng nhập bằng chúng.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'khoa-chi-dung-cho-test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');
const { taoApp } = require('../src/app');

const app = taoApp();
const dot = `${Date.now()}`.slice(-8);
let dem = 0;
const MK = 'Mkdau1234';

const dangNhap = (ten, mk) => request(app).post('/api/auth/dang-nhap').send({ ten_dang_nhap: ten, mat_khau: mk });
const doi = (token, body) => request(app).post('/api/auth/doi-mat-khau').set('Authorization', `Bearer ${token}`).send(body);
async function taoTk(quyen) {
  const ten = `tam_dmk_${dot}_${dem++}`;
  const [nv] = await pool.query("INSERT INTO NhanVien (ho_ten, chuc_vu) VALUES (?, 'TEST')", [`TEST_DMK_${ten}`]);
  await pool.query('INSERT INTO TaiKhoan (ma_nhan_vien, ten_dang_nhap, mat_khau_hash, quyen_truy_cap) VALUES (?, ?, ?, ?)', [nv.insertId, ten, bcrypt.hashSync(MK, 4), quyen]);
  const res = await dangNhap(ten, MK);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return { ten, token: res.body.data.token, ma_nv: nv.insertId };
}
async function donDep() {
  await pool.query("DELETE tk FROM TaiKhoan tk JOIN NhanVien nv ON nv.ma_nhan_vien = tk.ma_nhan_vien WHERE nv.ho_ten LIKE 'TEST\\_DMK\\_%'");
  await pool.query("DELETE FROM NhanVien WHERE ho_ten LIKE 'TEST\\_DMK\\_%'");
}
before(donDep);
after(async () => { await donDep(); await pool.end(); });

test('AUTH-02: quản lý và nhân viên đều đổi được mật khẩu của mình; mật khẩu mới dùng được, mật khẩu cũ hết dùng; không lộ băm', async () => {
  for (const quyen of ['quan_ly', 'nhan_vien']) { // KHÔNG tạo tài khoản admin ở đây: tests/nhan-su.test.js đếm số admin
    const u = await taoTk(quyen);
    const r = await doi(u.token, { mat_khau_cu: MK, mat_khau_moi: 'Moi12345@' });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual(r.body.data, { da_doi: true });
    assert.ok(!JSON.stringify(r.body).includes('hash'));
    assert.equal((await dangNhap(u.ten, 'Moi12345@')).status, 200, quyen);
    const cu = await dangNhap(u.ten, MK);
    assert.equal(cu.status, 401); assert.equal(cu.body.loi, 'SAI_THONG_TIN');
    const toi = await request(app).get('/api/auth/toi').set('Authorization', `Bearer ${u.token}`);
    assert.equal(toi.status, 200, 'token đã cấp vẫn dùng được đến khi hết hạn (không có cột phiên bản mật khẩu)');
  }
});

test('AUTH-02: sai mật khẩu cũ -> 401 SAI_MAT_KHAU_CU và không đổi gì; mới trùng cũ -> 400', async () => {
  const u = await taoTk('nhan_vien');
  const sai = await doi(u.token, { mat_khau_cu: 'Saimk12345', mat_khau_moi: 'Moi12345@' });
  assert.equal(sai.status, 401); assert.equal(sai.body.loi, 'SAI_MAT_KHAU_CU');
  assert.equal((await dangNhap(u.ten, MK)).status, 200);
  assert.equal((await dangNhap(u.ten, 'Moi12345@')).status, 401);
  const trung = await doi(u.token, { mat_khau_cu: MK, mat_khau_moi: MK });
  assert.equal(trung.status, 400); assert.equal(trung.body.loi, 'MAT_KHAU_MOI_TRUNG_CU');
  assert.equal((await dangNhap(u.ten, MK)).status, 200);
  // sai mk cũ được kiểm trước mk trùng: cũ sai + mới = cũ sai -> 401
  assert.equal((await doi(u.token, { mat_khau_cu: 'Saimk12345', mat_khau_moi: 'Saimk12345' })).status, 401);
});

test('AUTH-02: mật khẩu yếu/đầu vào sai -> 400 DU_LIEU_SAI kèm đúng trường; thiếu token 401', async () => {
  const u = await taoTk('quan_ly');
  const yeu = ['Ab1', 'abcde1x', 'abcdefgh', '12345678', '12345678!!', 'a'.repeat(73) + '1', 'é1'.repeat(25)]; // ngắn, 7 ký tự, thiếu số, thiếu chữ, thiếu chữ, >72 ký tự, >72 byte
  for (const mk of yeu) {
    const r = await doi(u.token, { mat_khau_cu: MK, mat_khau_moi: mk });
    assert.equal(r.status, 400, mk);
    assert.equal(r.body.loi, 'DU_LIEU_SAI');
    assert.ok(r.body.chi_tiet.some(c => c.truong === 'mat_khau_moi'), mk);
  }
  for (const b of [{}, { mat_khau_cu: MK }, { mat_khau_moi: 'Moi12345@' }, { mat_khau_cu: '', mat_khau_moi: 'Moi12345@' }, { mat_khau_cu: MK, mat_khau_moi: 'Moi12345@', ten_dang_nhap: 'x' }, { mat_khau_cu: 5, mat_khau_moi: 'Moi12345@' }]) {
    assert.equal((await doi(u.token, b)).status, 400, JSON.stringify(b));
  }
  assert.equal((await dangNhap(u.ten, MK)).status, 200, 'mọi lần sai đều không làm đổi mật khẩu');
  assert.equal((await request(app).post('/api/auth/doi-mat-khau').send({ mat_khau_cu: MK, mat_khau_moi: 'Moi12345@' })).status, 401);
  assert.equal((await doi('token-rac', { mat_khau_cu: MK, mat_khau_moi: 'Moi12345@' })).status, 401);
  // mật khẩu có khoảng trắng và ký tự Unicode vẫn hợp lệ nếu có chữ và số
  assert.equal((await doi(u.token, { mat_khau_cu: MK, mat_khau_moi: 'cà phê 2026' })).status, 200);
  assert.equal((await dangNhap(u.ten, 'cà phê 2026')).status, 200);
});

test('AUTH-02 đồng thời: 5 lần đổi cùng lúc với cùng mật khẩu cũ -> đúng một 200, còn lại 401; mật khẩu cuối là của lần thắng', async () => {
  for (let v = 0; v < 4; v++) {
    const u = await taoTk('nhan_vien');
    const moi = Array.from({ length: 5 }, (_, i) => `Moi${v}${i}abcd`);
    const rs = await Promise.all(moi.map(mk => doi(u.token, { mat_khau_cu: MK, mat_khau_moi: mk })));
    assert.deepEqual(rs.map(r => r.status).sort(), [200, 401, 401, 401, 401], JSON.stringify(rs.map(r => r.body)));
    const thang = moi[rs.findIndex(r => r.status === 200)];
    assert.equal((await dangNhap(u.ten, thang)).status, 200);
    for (const mk of moi.filter(m => m !== thang)) assert.equal((await dangNhap(u.ten, mk)).status, 401);
  }
});
