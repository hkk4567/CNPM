// Test module he-thong (HT-01 ẩn trang): service + script + endpoint. KHÔNG cần MySQL (xác thực được thay bằng bản giả).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'khoa-chi-dung-cho-test';
const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const express = require('express');
const request = require('supertest');

const thuMuc = fs.mkdtempSync(path.join(os.tmpdir(), 'trang-an-'));
const file = path.join(thuMuc, 'trang-an.json');
process.env.TRANG_AN_FILE = file;

const authService = require('../src/modules/auth/auth.service');
const service = require('../src/modules/he-thong/he-thong.service');
const { laMaHopLe } = require('../src/config/trang');
const { khongTimThay, xuLyLoi } = require('../src/middlewares/xu-ly-loi');
const { LoiNghiepVu } = require('../src/utils/loi-nghiep-vu');

authService.xacThucToken = async t => { // thay cho tra CSDL
  if (t !== 'tot') throw new LoiNghiepVu(401, 'CHUA_DANG_NHAP', 'Chưa đăng nhập hoặc phiên đã hết hạn');
  return { ma_tai_khoan: 1, ho_ten: 'Test', quyen_truy_cap: 'nhan_vien' };
};
const app = express();
app.use('/api/he-thong', require('../src/modules/he-thong/he-thong.routes'));
app.use(khongTimThay);
app.use(xuLyLoi);

const SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'an-trang', 'an-trang.js');
const chayScript = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { env: process.env, encoding: 'utf8' });

beforeEach(() => fs.rmSync(file, { force: true }));
after(() => fs.rmSync(thuMuc, { recursive: true, force: true }));

test('danh sách mã: trang và tab hợp lệ, mã lạ không hợp lệ', () => {
  for (const m of ['nhan-vien', 'kho', 'kho/lich-su-nhap', 'bao-cao/chi-phi']) assert.equal(laMaHopLe(m), true, m);
  for (const m of ['', 'abc', 'kho/khong-co', 'nhan-vien/x']) assert.equal(laMaHopLe(m), false, m);
});

test('service: file chưa có -> không ẩn gì; ẩn rồi hiện lại', () => {
  assert.deepEqual(service.layTrangAn(), {});
  const kq = service.an(['nhan-vien', 'nhan-vien', 'kho/ton-kho'], '  Bảo trì  ');
  assert.deepEqual(kq.da_an, ['nhan-vien', 'kho/ton-kho']);
  const ds = service.layTrangAn();
  assert.equal(ds['nhan-vien'].ly_do, 'Bảo trì');
  assert.ok(!Number.isNaN(Date.parse(ds['nhan-vien'].luc)));
  assert.deepEqual(service.hien(['nhan-vien', 'khuyen-mai']), { da_hien: ['nhan-vien'], khong_an: ['khuyen-mai'], van_bi_che: [] });
  assert.deepEqual(Object.keys(service.layTrangAn()), ['kho/ton-kho']);
  assert.equal(service.hienHet().da_hien, 1);
  assert.deepEqual(service.layTrangAn(), {});
});

test('service: lý do mặc định, mã sai bị từ chối và KHÔNG ghi gì', () => {
  assert.equal(service.an(['hoa-don']).ly_do, service.LY_DO_MAC_DINH);
  assert.throws(() => service.an(['kho', 'ma-sai']), /ma-sai/);
  assert.throws(() => service.an([]), /Chưa nêu mã/);
  assert.throws(() => service.an(['kho'], 'x'.repeat(201)), /tối đa/);
  assert.deepEqual(Object.keys(service.layTrangAn()), ['hoa-don']);
});

test('service: ẩn trang cha thì mọi tab con bị ẩn; hiện tab con không gỡ được ẩn của cha', () => {
  service.an(['kho']);
  const ds = service.layTrangAn();
  assert.equal(service.timTrangAn(ds, 'kho/lich-su-nhap').ma_an, 'kho');
  assert.equal(service.timTrangAn(ds, 'kho').ma_an, 'kho');
  assert.equal(service.timTrangAn(ds, 'bao-cao/doanh-thu'), null);
  assert.deepEqual(service.hien(['kho/ton-kho']).van_bi_che, ['kho/ton-kho']);
  service.hien(['kho']);
  service.an(['kho/lich-su-nhap']);
  const ds2 = service.layTrangAn();
  assert.equal(service.timTrangAn(ds2, 'kho/lich-su-nhap').ma_an, 'kho/lich-su-nhap');
  assert.equal(service.timTrangAn(ds2, 'kho/nguyen-lieu'), null);
});

test('service: file hỏng -> giữ bản đọc tốt gần nhất (không mở nhầm trang đang ẩn); ghi từ chối để không đè mất dữ liệu', () => {
  service.an(['kho/lich-su-nhap']);
  assert.deepEqual(Object.keys(service.layTrangAn()), ['kho/lich-su-nhap']);
  fs.writeFileSync(file, '{ hong');
  const warn = console.warn; console.warn = () => {};
  try { assert.deepEqual(Object.keys(service.layTrangAn()), ['kho/lich-su-nhap']); } finally { console.warn = warn; }
  assert.throws(() => service.an(['kho']));
  assert.equal(fs.readFileSync(file, 'utf8'), '{ hong');
});

test('service: vừa khởi động mà file hỏng -> không ẩn gì, không làm sập; mã rỗng không gây lỗi', () => {
  fs.writeFileSync(file, '{ hong');
  const r = spawnSync(process.execPath, ['-e', "const s=require('./src/modules/he-thong/he-thong.service');console.log(JSON.stringify(s.layTrangAn()));console.log(JSON.stringify(s.timTrangAn({a:{}},undefined)))"], { env: process.env, encoding: 'utf8', cwd: path.join(__dirname, '..') });
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.stdout.trim().split('\n'), ['{}', 'null']);
});

test('endpoint GET /api/he-thong/trang-an: cần đăng nhập, trả danh sách đang ẩn', async () => {
  const chua = await request(app).get('/api/he-thong/trang-an');
  assert.equal(chua.status, 401);
  assert.equal(chua.body.ok, false);

  const trong = await request(app).get('/api/he-thong/trang-an').set('Authorization', 'Bearer tot');
  assert.equal(trong.status, 200);
  assert.deepEqual(trong.body, { ok: true, data: { trang_an: {} } });

  service.an(['nhan-vien'], 'Đang cập nhật');
  const co = await request(app).get('/api/he-thong/trang-an').set('Authorization', 'Bearer tot');
  assert.equal(co.body.data.trang_an['nhan-vien'].ly_do, 'Đang cập nhật');
});

test('script an-trang.js: an / ds / hien / mã sai / hien-het', () => {
  let r = chayScript('an', 'nhan-vien', 'kho/lich-su-nhap', '--ly-do', 'Đang bảo trì');
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Đã ẩn: nhan-vien, kho\/lich-su-nhap/);
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8'))['nhan-vien'].ly_do, 'Đang bảo trì');

  r = chayScript('ds');
  assert.match(r.stdout, /nhan-vien\s+Nhân viên\s+ĐANG ẨN – Đang bảo trì/);
  assert.match(r.stdout, /kho\/ton-kho\s+Kho › Tồn kho\s+hiện/);

  r = chayScript('an', 'kho', 'ma-sai');
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Mã trang không hợp lệ: ma-sai/);
  assert.match(r.stderr, /Mã hợp lệ: .*bao-cao\/chi-phi/);
  assert.ok(!('kho' in JSON.parse(fs.readFileSync(file, 'utf8'))), 'mã sai không được làm ghi một phần');

  r = chayScript('hien', 'nhan-vien');
  assert.match(r.stdout, /Đã hiện lại: nhan-vien/);
  r = chayScript('hien-het');
  assert.match(r.stdout, /Đã hiện lại tất cả \(1 mục\)/);
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), {});

  assert.equal(chayScript('lung-tung').status, 1);
  assert.equal(chayScript('an').status, 1);
});
