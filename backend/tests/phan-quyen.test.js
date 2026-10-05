// Test middleware phân quyền A/Q/N bằng một app nhỏ gắn xacThuc + choPhep. Cần dữ liệu mẫu.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'khoa-chi-dung-cho-test';
const { test, after, before } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const pool = require('../src/config/db');
const authService = require('../src/modules/auth/auth.service');
const xacThuc = require('../src/middlewares/xac-thuc');
const { choPhep, QUYEN } = require('../src/middlewares/phan-quyen');
const { khongTimThay, xuLyLoi } = require('../src/middlewares/xu-ly-loi');

const app = express();
app.get('/chi-admin', xacThuc, choPhep(QUYEN.ADMIN), (req, res) => res.json({ ok: true }));
app.get('/admin-quan-ly', xacThuc, choPhep(QUYEN.ADMIN, QUYEN.QUAN_LY), (req, res) => res.json({ ok: true }));
app.get('/moi-nguoi', xacThuc, (req, res) => res.json({ ok: true }));
app.use(khongTimThay);
app.use(xuLyLoi);

const token = {};
before(async () => {
  for (const [ten, mk] of [['admin', 'Admin@123'], ['quanly', 'Quanly@123'], ['nhanvien', 'Nhanvien@123']]) {
    token[ten] = (await authService.dangNhap({ ten_dang_nhap: ten, mat_khau: mk })).token;
  }
});
after(() => pool.end());

const goi = (duong, ten) => {
  const r = request(app).get(duong);
  return ten ? r.set('Authorization', `Bearer ${token[ten]}`) : r;
};

test('ma trận phân quyền', async () => {
  const bang = [
    ['/chi-admin', 'admin', 200], ['/chi-admin', 'quanly', 403], ['/chi-admin', 'nhanvien', 403],
    ['/admin-quan-ly', 'admin', 200], ['/admin-quan-ly', 'quanly', 200], ['/admin-quan-ly', 'nhanvien', 403],
    ['/moi-nguoi', 'admin', 200], ['/moi-nguoi', 'quanly', 200], ['/moi-nguoi', 'nhanvien', 200],
  ];
  for (const [duong, ten, mong] of bang) {
    const res = await goi(duong, ten);
    assert.equal(res.status, mong, `${ten} -> ${duong}`);
    if (mong === 403) assert.equal(res.body.loi, 'KHONG_DU_QUYEN');
  }
});

test('không đăng nhập -> 401 ở mọi route được bảo vệ', async () => {
  for (const duong of ['/chi-admin', '/admin-quan-ly', '/moi-nguoi']) {
    const res = await goi(duong);
    assert.equal(res.status, 401, duong);
    assert.equal(res.body.loi, 'CHUA_DANG_NHAP');
  }
});

test('header sai kiểu (không phải Bearer) -> 401', async () => {
  const res = await request(app).get('/moi-nguoi').set('Authorization', `Basic ${token.admin}`);
  assert.equal(res.status, 401);
});
