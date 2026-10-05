// Test module san-pham: POS-01 (menu), SP-01 (danh mục), SP-02..SP-05 (sản phẩm). Cần MySQL + dữ liệu mẫu (npm run db:init).
// Test tự dọn dữ liệu nó tạo (tên bắt đầu bằng TEST_).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'khoa-chi-dung-cho-test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const pool = require('../src/config/db');
const { taoApp } = require('../src/app');

const app = taoApp();
const token = {};
const hau = Date.now();
const khoiTao = [];

const goi = (phuongThuc, duong, ten) => {
  const r = request(app)[phuongThuc](duong);
  return ten ? r.set('Authorization', `Bearer ${token[ten]}`) : r;
};

before(async () => {
  for (const [ten, mk] of [['admin', 'Admin@123'], ['quanly', 'Quanly@123'], ['nhanvien', 'Nhanvien@123']]) {
    const res = await request(app).post('/api/auth/dang-nhap').send({ ten_dang_nhap: ten, mat_khau: mk });
    token[ten] = res.body.data.token;
  }
});
after(async () => {
  await pool.query("DELETE FROM SanPham WHERE ten_san_pham LIKE 'TEST\\_SP\\_%'");
  await pool.query("DELETE FROM DanhMuc WHERE ten_danh_muc LIKE 'TEST\\_DM\\_%'");
  await pool.end();
});

// ---------- POS-01: menu ----------
test('menu: chỉ món đang bán, kèm số ly tối đa theo tồn kho', async () => {
  const res = await goi('get', '/api/san-pham/menu', 'nhanvien');
  assert.equal(res.status, 200);
  const monThat = res.body.data.filter(m => !m.ten_san_pham.startsWith('TEST_')); // bỏ dữ liệu tạm của test khác
  const ten = monThat.map(m => m.ten_san_pham);
  assert.equal(monThat.length, 7);
  assert.ok(!ten.includes('Croissant'), 'món ngừng bán không được hiện');
  const theoTen = Object.fromEntries(monThat.map(m => [m.ten_san_pham, m]));
  assert.equal(theoTen['Cà phê đen'].so_ly_toi_da, 250);
  assert.equal(theoTen['Cà phê sữa'].so_ly_toi_da, 133);
  assert.equal(theoTen['Bạc xỉu'].so_ly_toi_da, 133);
  assert.equal(theoTen['Trà sữa trân châu'].so_ly_toi_da, 16);
  assert.equal(theoTen['Cà phê đen'].gia_ban, 25000);
  assert.equal(typeof theoTen['Cà phê đen'].gia_ban, 'number');
  // chưa có công thức -> không giới hạn
  assert.equal(theoTen['Bánh tiramisu'].so_ly_toi_da, null);
  assert.equal(theoTen['Bánh tiramisu'].du_nguyen_lieu, true);
});

test('menu: lọc theo danh mục, tìm không dấu, ký tự % không khớp tất cả', async () => {
  const dm = await goi('get', '/api/san-pham/menu?ma_danh_muc=1', 'nhanvien');
  assert.deepEqual(dm.body.data.map(m => m.ten_san_pham).sort(), ['Bạc xỉu', 'Cà phê sữa', 'Cà phê đen'].sort());

  const kd = await goi('get', '/api/san-pham/menu?tu_khoa=ca%20phe', 'nhanvien');
  assert.deepEqual(kd.body.data.map(m => m.ten_san_pham).sort(), ['Cà phê sữa', 'Cà phê đen'].sort());

  const phanTram = await goi('get', '/api/san-pham/menu?tu_khoa=%25', 'nhanvien');
  assert.equal(phanTram.body.data.length, 0);

  const sai = await goi('get', '/api/san-pham/menu?ma_danh_muc=abc', 'nhanvien');
  assert.equal(sai.status, 400);
  assert.equal(sai.body.loi, 'DU_LIEU_SAI');
});

test('menu: món hết nguyên liệu -> so_ly_toi_da = 0, du_nguyen_lieu = false', async () => {
  const [rows] = await pool.query('SELECT ma_nguyen_lieu, so_luong_ton FROM NguyenLieu WHERE ten_nguyen_lieu = ?', ['Trân châu']);
  const ma = rows[0].ma_nguyen_lieu;
  const cu = rows[0].so_luong_ton;
  try {
    await pool.query('UPDATE NguyenLieu SET so_luong_ton = 40 WHERE ma_nguyen_lieu = ?', [ma]); // < 50g mỗi ly
    const res = await goi('get', '/api/san-pham/menu?tu_khoa=tra%20sua', 'nhanvien');
    assert.equal(res.body.data[0].so_ly_toi_da, 0);
    assert.equal(res.body.data[0].du_nguyen_lieu, false);
  } finally {
    await pool.query('UPDATE NguyenLieu SET so_luong_ton = ? WHERE ma_nguyen_lieu = ?', [cu, ma]);
  }
});

// ---------- Phân quyền ----------
test('phân quyền: nhân viên chỉ xem menu; quản lý và admin được quản trị', async () => {
  assert.equal((await goi('get', '/api/san-pham/menu')).status, 401);
  for (const [pt, duong] of [['get', '/api/san-pham'], ['get', '/api/san-pham/1'], ['post', '/api/san-pham'],
    ['patch', '/api/san-pham/1'], ['delete', '/api/san-pham/1'], ['post', '/api/danh-muc'],
    ['put', '/api/danh-muc/1'], ['delete', '/api/danh-muc/1']]) {
    const res = await goi(pt, duong, 'nhanvien').send({});
    assert.equal(res.status, 403, `${pt} ${duong}`);
    assert.equal(res.body.loi, 'KHONG_DU_QUYEN');
  }
  assert.equal((await goi('get', '/api/danh-muc', 'nhanvien')).status, 200, 'nhân viên được xem danh mục');
  assert.equal((await goi('get', '/api/san-pham', 'quanly')).status, 200);
  assert.equal((await goi('get', '/api/san-pham', 'admin')).status, 200);
});

// ---------- SP-01: danh mục ----------
test('danh mục: tạo, trùng tên, đổi tên, xóa; chặn xóa khi còn sản phẩm', async () => {
  const ten = `TEST_DM_${hau}`;
  const tao = await goi('post', '/api/danh-muc', 'admin').send({ ten_danh_muc: `  ${ten}  ` });
  assert.equal(tao.status, 201);
  assert.equal(tao.body.data.ten_danh_muc, ten, 'tự cắt khoảng trắng hai đầu');
  const ma = tao.body.data.ma_danh_muc;

  const trung = await goi('post', '/api/danh-muc', 'admin').send({ ten_danh_muc: ten });
  assert.equal(trung.status, 409);
  assert.equal(trung.body.loi, 'TRUNG_TEN_DANH_MUC');

  const sua = await goi('put', `/api/danh-muc/${ma}`, 'quanly').send({ ten_danh_muc: `${ten}_B` });
  assert.equal(sua.status, 200);
  assert.equal(sua.body.data.ten_danh_muc, `${ten}_B`);

  const ds = await goi('get', '/api/danh-muc', 'nhanvien');
  const cafe = ds.body.data.find(d => d.ten_danh_muc === 'Cà phê');
  assert.equal(cafe.so_san_pham, 3);
  assert.ok(ds.body.data.some(d => d.ma_danh_muc === ma && d.so_san_pham === 0));

  const sp = await goi('post', '/api/san-pham', 'admin').send({ ma_danh_muc: ma, ten_san_pham: `TEST_SP_DM_${hau}`, gia_ban: 10000 });
  const chan = await goi('delete', `/api/danh-muc/${ma}`, 'admin');
  assert.equal(chan.status, 409);
  assert.equal(chan.body.loi, 'DANH_MUC_DANG_DUNG');
  await goi('delete', `/api/san-pham/${sp.body.data.ma_san_pham}`, 'admin');

  assert.equal((await goi('delete', `/api/danh-muc/${ma}`, 'admin')).status, 200);
  assert.equal((await goi('delete', `/api/danh-muc/${ma}`, 'admin')).status, 404);
  assert.equal((await goi('post', '/api/danh-muc', 'admin').send({ ten_danh_muc: '' })).status, 400);
});

// ---------- SP-02..SP-05: sản phẩm ----------
test('sản phẩm: tạo, kiểm tra đầu vào, sửa, ngừng bán, xem chi tiết', async () => {
  const tao = await goi('post', '/api/san-pham', 'quanly').send({ ma_danh_muc: 1, ten_san_pham: `TEST_SP_${hau}`, gia_ban: 30000 });
  assert.equal(tao.status, 201);
  assert.equal(tao.body.data.trang_thai, 'con_ban', 'mặc định con_ban');
  assert.equal(tao.body.data.ten_danh_muc, 'Cà phê');
  const ma = tao.body.data.ma_san_pham;

  const sai = await goi('post', '/api/san-pham', 'quanly').send({ ma_danh_muc: 1, gia_ban: -5 });
  assert.equal(sai.status, 400);
  assert.deepEqual(sai.body.chi_tiet.map(c => c.truong).sort(), ['gia_ban', 'ten_san_pham']);
  assert.equal((await goi('post', '/api/san-pham', 'quanly').send({ ma_danh_muc: 99999, ten_san_pham: 'TEST_X', gia_ban: 1 })).status, 404);
  assert.equal((await goi('post', '/api/san-pham', 'quanly').send({ ma_danh_muc: 1, ten_san_pham: 'TEST_X', gia_ban: '5000' })).status, 400, 'gia_ban phải là số, không nhận chuỗi');

  assert.equal((await goi('patch', `/api/san-pham/${ma}`, 'quanly').send({})).status, 400, 'sửa rỗng bị chặn');
  const sua = await goi('patch', `/api/san-pham/${ma}`, 'quanly').send({ gia_ban: 32000.5 });
  assert.equal(sua.body.data.gia_ban, 32000.5);
  assert.equal(sua.body.data.ten_san_pham, `TEST_SP_${hau}`, 'trường không gửi giữ nguyên');
  assert.equal((await goi('patch', `/api/san-pham/${ma}`, 'quanly').send({ ma_danh_muc: 99999 })).status, 404);
  assert.equal((await goi('patch', '/api/san-pham/99999', 'quanly').send({ gia_ban: 1 })).status, 404);

  const menuTruoc = await goi('get', `/api/san-pham/menu?tu_khoa=TEST_SP_${hau}`, 'nhanvien');
  assert.equal(menuTruoc.body.data.length, 1);
  await goi('patch', `/api/san-pham/${ma}`, 'quanly').send({ trang_thai: 'ngung_ban' });
  const menuSau = await goi('get', `/api/san-pham/menu?tu_khoa=TEST_SP_${hau}`, 'nhanvien');
  assert.equal(menuSau.body.data.length, 0, 'ngừng bán thì biến khỏi menu');

  const ct = await goi('get', `/api/san-pham/${ma}`, 'quanly');
  assert.equal(ct.body.data.trang_thai, 'ngung_ban');
  assert.equal((await goi('get', '/api/san-pham/abc', 'quanly')).status, 400);
  assert.equal((await goi('get', '/api/san-pham/99999', 'quanly')).status, 404);
  await goi('delete', `/api/san-pham/${ma}`, 'quanly');
});

test('sản phẩm: danh sách quản trị có phân trang và bộ lọc, gồm cả ngừng bán', async () => {
  const res = await goi('get', '/api/san-pham?moi_trang=3&trang=2', 'admin');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 3);
  assert.equal(res.body.trang, 2);
  assert.equal(res.body.moi_trang, 3);
  assert.ok(res.body.tong_so_ban_ghi >= 8);

  const ngung = await goi('get', '/api/san-pham?trang_thai=ngung_ban', 'admin');
  assert.ok(ngung.body.data.some(s => s.ten_san_pham === 'Croissant'));
  assert.ok(ngung.body.data.every(s => s.trang_thai === 'ngung_ban'));

  assert.equal((await goi('get', '/api/san-pham?moi_trang=1000', 'admin')).status, 400);
  assert.equal((await goi('get', '/api/san-pham?trang_thai=khac', 'admin')).status, 400);
});

test('xóa sản phẩm: chưa bán thì xóa kèm công thức và liên kết khuyến mãi (transaction)', async () => {
  const tao = await goi('post', '/api/san-pham', 'admin').send({ ma_danh_muc: 1, ten_san_pham: `TEST_SP_XOA_${hau}`, gia_ban: 1000 });
  const ma = tao.body.data.ma_san_pham;
  await pool.query('INSERT INTO CongThuc (ma_san_pham, ma_nguyen_lieu, dinh_luong) VALUES (?, 1, 5)', [ma]);
  await pool.query('INSERT INTO KhuyenMaiSanPham (ma_khuyen_mai, ma_san_pham) VALUES (1, ?)', [ma]);

  const xoa = await goi('delete', `/api/san-pham/${ma}`, 'admin');
  assert.equal(xoa.status, 200);
  assert.deepEqual(xoa.body.data, { da_xoa: true });
  for (const bang of ['SanPham', 'CongThuc', 'KhuyenMaiSanPham']) {
    const [[{ n }]] = await pool.query(`SELECT COUNT(*) AS n FROM ${bang} WHERE ma_san_pham = ?`, [ma]);
    assert.equal(n, 0, bang);
  }
  assert.equal((await goi('delete', `/api/san-pham/${ma}`, 'admin')).status, 404);
});

test('xóa sản phẩm: đã bán trong hóa đơn thì chặn, dữ liệu còn nguyên', async () => {
  const tao = await goi('post', '/api/san-pham', 'admin').send({ ma_danh_muc: 1, ten_san_pham: `TEST_SP_DABAN_${hau}`, gia_ban: 1000 });
  const ma = tao.body.data.ma_san_pham;
  const [hd] = await pool.query('INSERT INTO HoaDon (ma_nhan_vien, so_thu_tu, thoi_gian_tao) VALUES (3, 9001, NOW() - INTERVAL 10 DAY)');
  await pool.query('INSERT INTO ChiTietHoaDon (ma_hoa_don, ma_san_pham, so_luong, don_gia) VALUES (?, ?, 1, 1000)', [hd.insertId, ma]);
  await pool.query('INSERT INTO CongThuc (ma_san_pham, ma_nguyen_lieu, dinh_luong) VALUES (?, 1, 5)', [ma]);
  try {
    const xoa = await goi('delete', `/api/san-pham/${ma}`, 'admin');
    assert.equal(xoa.status, 409);
    assert.equal(xoa.body.loi, 'SAN_PHAM_DA_BAN');
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM CongThuc WHERE ma_san_pham = ?', [ma]);
    assert.equal(n, 1, 'bị chặn thì công thức không được mất (rollback)');
    assert.equal((await goi('patch', `/api/san-pham/${ma}`, 'admin').send({ trang_thai: 'ngung_ban' })).status, 200, 'đã bán thì dùng ngừng bán');
  } finally {
    await pool.query('DELETE FROM ChiTietHoaDon WHERE ma_hoa_don = ?', [hd.insertId]);
    await pool.query('DELETE FROM HoaDon WHERE ma_hoa_don = ?', [hd.insertId]);
    await pool.query('DELETE FROM CongThuc WHERE ma_san_pham = ?', [ma]);
  }
});
