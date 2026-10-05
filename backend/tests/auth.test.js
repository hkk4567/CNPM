// Test AUTH-01 và middleware xác thực. Cần: đã chạy `npm run db:init` (dữ liệu mẫu) và MySQL đang bật.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'khoa-chi-dung-cho-test';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/db');
const { taoApp } = require('../src/app');

const app = taoApp();
const dangNhap = (ten_dang_nhap, mat_khau) => request(app).post('/api/auth/dang-nhap').send({ ten_dang_nhap, mat_khau });

after(() => pool.end());

test('health: máy chủ và CSDL đều ok', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data, { may_chu: 'ok', csdl: 'ok' });
});

test('đăng nhập đúng cho 3 quyền mẫu', async () => {
  for (const [tk, mk, quyen] of [['admin', 'Admin@123', 'admin'], ['quanly', 'Quanly@123', 'quan_ly'], ['nhanvien', 'Nhanvien@123', 'nhan_vien']]) {
    const res = await dangNhap(tk, mk);
    assert.equal(res.status, 200, tk);
    assert.equal(res.body.ok, true);
    assert.equal(typeof res.body.data.token, 'string');
    assert.equal(res.body.data.nguoi_dung.quyen_truy_cap, quyen);
    assert.ok(!JSON.stringify(res.body).includes('mat_khau_hash'), 'không được trả băm mật khẩu');
  }
});

test('sai mật khẩu và sai tên đăng nhập trả CÙNG một lỗi (không lộ tài khoản nào tồn tại)', async () => {
  const a = await dangNhap('admin', 'sai-mat-khau');
  const b = await dangNhap('khong-co-nguoi-nay', 'Admin@123');
  for (const res of [a, b]) {
    assert.equal(res.status, 401);
    assert.equal(res.body.loi, 'SAI_THONG_TIN');
  }
  assert.equal(a.body.thong_bao, b.body.thong_bao);
});

test('thiếu hoặc rỗng dữ liệu -> 400 DU_LIEU_SAI kèm chi tiết từng trường', async () => {
  const res = await request(app).post('/api/auth/dang-nhap').send({ ten_dang_nhap: '   ' });
  assert.equal(res.status, 400);
  assert.equal(res.body.loi, 'DU_LIEU_SAI');
  const truong = res.body.chi_tiet.map(c => c.truong).sort();
  assert.deepEqual(truong, ['mat_khau', 'ten_dang_nhap']);
});

test('JSON hỏng -> 400; route không tồn tại -> 404', async () => {
  const hong = await request(app).post('/api/auth/dang-nhap').set('Content-Type', 'application/json').send('{hong');
  assert.equal(hong.status, 400);
  assert.equal(hong.body.loi, 'DU_LIEU_SAI');
  const khong = await request(app).get('/api/khong-co');
  assert.equal(khong.status, 404);
  assert.equal(khong.body.loi, 'KHONG_TIM_THAY');
});

test('GET /api/auth/toi: không token, token rác, token hết hạn, token đúng', async () => {
  const khong = await request(app).get('/api/auth/toi');
  assert.equal(khong.status, 401);
  assert.equal(khong.body.loi, 'CHUA_DANG_NHAP');

  const rac = await request(app).get('/api/auth/toi').set('Authorization', 'Bearer abc.def.ghi');
  assert.equal(rac.status, 401);
  assert.equal(rac.body.loi, 'TOKEN_KHONG_HOP_LE');

  const hetHan = jwt.sign({ sub: '1' }, process.env.JWT_SECRET, { expiresIn: -10 });
  const r2 = await request(app).get('/api/auth/toi').set('Authorization', `Bearer ${hetHan}`);
  assert.equal(r2.status, 401);
  assert.equal(r2.body.loi, 'TOKEN_HET_HAN');

  const { body } = await dangNhap('quanly', 'Quanly@123');
  const dung = await request(app).get('/api/auth/toi').set('Authorization', `Bearer ${body.data.token}`);
  assert.equal(dung.status, 200);
  assert.equal(dung.body.data.quyen_truy_cap, 'quan_ly');
});

test('nhân viên nghỉ việc: bị khóa đăng nhập và token cũ mất hiệu lực ngay', async () => {
  // Dùng nhân viên số 4 (chỉ test này đụng tới) để không ảnh hưởng test khác chạy song song
  const [r] = await pool.query(
    'INSERT INTO TaiKhoan (ma_nhan_vien, ten_dang_nhap, mat_khau_hash, quyen_truy_cap) VALUES (4, ?, ?, ?)',
    ['tam_nghi_viec', bcrypt.hashSync('Tam@12345', 10), 'nhan_vien']);
  try {
    await pool.query("UPDATE NhanVien SET trang_thai = 'dang_lam' WHERE ma_nhan_vien = 4");
    const vao = await dangNhap('tam_nghi_viec', 'Tam@12345');
    assert.equal(vao.status, 200);
    const token = vao.body.data.token;
    assert.equal((await request(app).get('/api/auth/toi').set('Authorization', `Bearer ${token}`)).status, 200);

    await pool.query("UPDATE NhanVien SET trang_thai = 'nghi_viec' WHERE ma_nhan_vien = 4");
    const cu = await request(app).get('/api/auth/toi').set('Authorization', `Bearer ${token}`);
    assert.equal(cu.status, 401);
    const khoa = await dangNhap('tam_nghi_viec', 'Tam@12345');
    assert.equal(khoa.status, 403);
    assert.equal(khoa.body.loi, 'TAI_KHOAN_BI_KHOA');
    // sai mật khẩu thì vẫn chỉ báo sai thông tin, không lộ trạng thái khóa
    assert.equal((await dangNhap('tam_nghi_viec', 'sai')).body.loi, 'SAI_THONG_TIN');
  } finally {
    await pool.query('DELETE FROM TaiKhoan WHERE ma_tai_khoan = ?', [r.insertId]);
    await pool.query("UPDATE NhanVien SET trang_thai = 'nghi_viec' WHERE ma_nhan_vien = 4");
  }
});
