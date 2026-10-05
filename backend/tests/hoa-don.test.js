// Test hoa-don: POS-02 (tạo order), POS-10 (danh sách order). Cần MySQL + dữ liệu mẫu (npm run db:init).
// Dùng sản phẩm/nguyên liệu/danh mục riêng tên TEST_HD_* để không đụng tồn kho mẫu; tự dọn dữ liệu đã tạo.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'khoa-chi-dung-cho-test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');
const { taoApp } = require('../src/app');

const app = taoApp();
const token = {};
const taoRa = []; // mã các hóa đơn do test tạo, để dọn
let spTest; let nlTest; let dmTest;
let nvRieng; // nhân viên + tài khoản RIÊNG của file này: đếm hóa đơn theo nhân viên này nên không bị file test khác chạy song song làm lệch

const goi = (pt, duong, ten) => {
  const r = request(app)[pt](duong);
  return ten ? r.set('Authorization', `Bearer ${token[ten]}`) : r;
};
const datOrder = async (ten, body) => {
  const res = await goi('post', '/api/hoa-don', ten).send(body);
  if (res.status === 201) taoRa.push(res.body.data.ma_hoa_don);
  return res;
};
// Chỉ đếm hóa đơn do nhân viên riêng của file này tạo (đếm toàn bảng sẽ sai khi test khác chạy song song)
const demHoaDon = async () => (await pool.query('SELECT COUNT(*) AS n FROM HoaDon WHERE ma_nhan_vien = ?', [nvRieng]))[0][0].n;

async function donDep() {
  await pool.query("DELETE c FROM ChiTietHoaDon c JOIN HoaDon h ON h.ma_hoa_don = c.ma_hoa_don JOIN NhanVien n ON n.ma_nhan_vien = h.ma_nhan_vien WHERE n.ho_ten = 'TEST_HD_NV'");
  await pool.query("DELETE h FROM HoaDon h JOIN NhanVien n ON n.ma_nhan_vien = h.ma_nhan_vien WHERE n.ho_ten = 'TEST_HD_NV'");
  await pool.query("DELETE t FROM TaiKhoan t JOIN NhanVien n ON n.ma_nhan_vien = t.ma_nhan_vien WHERE n.ho_ten = 'TEST_HD_NV'");
  await pool.query("DELETE FROM NhanVien WHERE ho_ten = 'TEST_HD_NV'");
  if (taoRa.length) {
    await pool.query('DELETE FROM ChiTietHoaDon WHERE ma_hoa_don IN (?)', [taoRa]);
    await pool.query('DELETE FROM HoaDon WHERE ma_hoa_don IN (?)', [taoRa]);
  }
  await pool.query("DELETE c FROM ChiTietHoaDon c JOIN SanPham sp ON sp.ma_san_pham = c.ma_san_pham WHERE sp.ten_san_pham LIKE 'TEST\\_HD\\_%'");
  await pool.query("DELETE ct FROM CongThuc ct JOIN SanPham sp ON sp.ma_san_pham = ct.ma_san_pham WHERE sp.ten_san_pham LIKE 'TEST\\_HD\\_%'");
  await pool.query("DELETE FROM SanPham WHERE ten_san_pham LIKE 'TEST\\_HD\\_%'");
  await pool.query("DELETE FROM NguyenLieu WHERE ten_nguyen_lieu LIKE 'TEST\\_HD\\_%'");
  await pool.query("DELETE FROM DanhMuc WHERE ten_danh_muc LIKE 'TEST\\_HD\\_%'");
}

before(async () => {
  await donDep(); // phòng lần chạy trước bị dừng giữa chừng
  for (const [ten, mk] of [['admin', 'Admin@123'], ['quanly', 'Quanly@123'], ['nhanvien', 'Nhanvien@123']]) {
    token[ten] = (await request(app).post('/api/auth/dang-nhap').send({ ten_dang_nhap: ten, mat_khau: mk })).body.data.token;
  }
  nvRieng = (await pool.query("INSERT INTO NhanVien (ho_ten, chuc_vu) VALUES ('TEST_HD_NV', 'test')"))[0].insertId;
  await pool.query("INSERT INTO TaiKhoan (ma_nhan_vien, ten_dang_nhap, mat_khau_hash, quyen_truy_cap) VALUES (?, 'test_hd_nv', ?, 'nhan_vien')", [nvRieng, bcrypt.hashSync('Test@12345', 10)]);
  token.rieng = (await request(app).post('/api/auth/dang-nhap').send({ ten_dang_nhap: 'test_hd_nv', mat_khau: 'Test@12345' })).body.data.token;
  dmTest = (await pool.query("INSERT INTO DanhMuc (ten_danh_muc) VALUES ('TEST_HD_DM')"))[0].insertId;
  spTest = (await pool.query('INSERT INTO SanPham (ma_danh_muc, ten_san_pham, gia_ban) VALUES (?, ?, 10000)', [dmTest, 'TEST_HD_SP']))[0].insertId;
  nlTest = (await pool.query("INSERT INTO NguyenLieu (ten_nguyen_lieu, don_vi_tinh, so_luong_ton) VALUES ('TEST_HD_NL', 'g', 30)"))[0].insertId;
  await pool.query('INSERT INTO CongThuc (ma_san_pham, ma_nguyen_lieu, dinh_luong) VALUES (?, ?, 20)', [spTest, nlTest]);
});
after(async () => { await donDep(); await pool.end(); });

// ---------- POS-02 ----------
test('tạo order: nhân viên lấy từ token, chụp lại giá, mỗi dòng một mã chi tiết, tạm tính đúng', async () => {
  const res = await datOrder('nhanvien', {
    ma_nhan_vien: 1, // cố tình gửi: phải bị bỏ qua, nhân viên lấy từ token
    items: [
      { ma_san_pham: 1, so_luong: 2, ghi_chu: '  ít đường  ' },
      { ma_san_pham: 1, so_luong: 1, ghi_chu: 'bình thường' }, // cùng sản phẩm, ghi chú khác
      { ma_san_pham: 7, so_luong: 1 },
    ],
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const hd = res.body.data;
  assert.equal(hd.trang_thai, 'dang_pha_che');
  assert.equal(hd.ma_nhan_vien, 3, 'lấy từ token (nhanvien = nhân viên số 3)');
  assert.equal(hd.ma_khach_hang, null);
  assert.ok(Number.isInteger(hd.so_thu_tu) && hd.so_thu_tu >= 1);
  assert.equal(hd.chi_tiet.length, 3);
  assert.equal(new Set(hd.chi_tiet.map(c => c.ma_chi_tiet)).size, 3, 'mỗi dòng một ma_chi_tiet riêng');
  assert.equal(hd.chi_tiet[0].ghi_chu, 'ít đường', 'tự cắt khoảng trắng');
  assert.equal(hd.chi_tiet[0].don_gia, 25000);
  assert.equal(hd.chi_tiet[0].giam_gia, 0);
  assert.equal(hd.chi_tiet[0].ma_khuyen_mai, null);
  assert.equal(hd.chi_tiet[0].thanh_tien, 50000);
  assert.equal(hd.tong_tien_tam_tinh, 2 * 25000 + 25000 + 45000);

});

test('tạo order: giá được chụp lại, đổi giá món sau đó không làm đổi dòng đã đặt', async () => {
  // Dùng sản phẩm riêng của test để không ảnh hưởng test khác chạy song song
  const res = await datOrder('nhanvien', { items: [{ ma_san_pham: spTest, so_luong: 1 }] });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.chi_tiet[0].don_gia, 10000);
  await pool.query('UPDATE SanPham SET gia_ban = 77000 WHERE ma_san_pham = ?', [spTest]);
  const [rows] = await pool.query('SELECT don_gia FROM ChiTietHoaDon WHERE ma_chi_tiet = ?', [res.body.data.chi_tiet[0].ma_chi_tiet]);
  assert.equal(rows[0].don_gia, 10000);
  await pool.query('UPDATE SanPham SET gia_ban = 10000 WHERE ma_san_pham = ?', [spTest]);
});

test('tạo order: khách thành viên hoặc khách vãng lai (null)', async () => {
  const cokhach = await datOrder('quanly', { ma_khach_hang: 1, items: [{ ma_san_pham: 2, so_luong: 1 }] });
  assert.equal(cokhach.status, 201);
  assert.equal(cokhach.body.data.ten_khach_hang, 'Nguyễn Minh Anh');
  assert.equal(cokhach.body.data.ma_nhan_vien, 2);
  const vanglai = await datOrder('quanly', { ma_khach_hang: null, items: [{ ma_san_pham: 2, so_luong: 1 }] });
  assert.equal(vanglai.status, 201);
  assert.equal(vanglai.body.data.ten_khach_hang, null);
});

test('tạo order: so_thu_tu không bao giờ trùng khi 8 order được tạo cùng lúc', async () => {
  const kq = await Promise.all(Array.from({ length: 8 }, () => datOrder('nhanvien', { items: [{ ma_san_pham: 2, so_luong: 1 }] })));
  for (const r of kq) assert.equal(r.status, 201, JSON.stringify(r.body));
  const so = kq.map(r => r.body.data.so_thu_tu);
  assert.equal(new Set(so).size, 8, `bị trùng so_thu_tu: ${so}`);
  // Không trùng với BẤT KỲ hóa đơn nào khác trong ngày (test khác có thể tạo order xen vào, nên không đòi liên tiếp)
  const [trung] = await pool.query(
    `SELECT so_thu_tu, COUNT(*) AS n FROM HoaDon WHERE thoi_gian_tao >= CURDATE() AND thoi_gian_tao < CURDATE() + INTERVAL 1 DAY
     GROUP BY so_thu_tu HAVING COUNT(*) > 1`);
  assert.deepEqual(trung, [], 'có so_thu_tu bị trùng trong ngày');
});

test('tạo order: kiểm tra đầu vào', async () => {
  const truoc = await demHoaDon();
  const ca = [
    [{}, ['items']],
    [{ items: [] }, ['items']],
    [{ items: [{ ma_san_pham: 1, so_luong: 0 }] }, ['items.0.so_luong']],
    [{ items: [{ ma_san_pham: 1, so_luong: 1.5 }] }, ['items.0.so_luong']],
    [{ items: [{ ma_san_pham: 1, so_luong: 100 }] }, ['items.0.so_luong']],
    [{ items: [{ ma_san_pham: '1', so_luong: 1 }] }, ['items.0.ma_san_pham']],
    [{ items: [{ ma_san_pham: 1, so_luong: 1, ghi_chu: 'x'.repeat(256) }] }, ['items.0.ghi_chu']],
    [{ ma_khach_hang: 0, items: [{ ma_san_pham: 1, so_luong: 1 }] }, ['ma_khach_hang']],
  ];
  for (const [body, truongMong] of ca) {
    const res = await goi('post', '/api/hoa-don', 'rieng').send(body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(res.body.loi, 'DU_LIEU_SAI');
    assert.deepEqual(res.body.chi_tiet.map(c => c.truong), truongMong, JSON.stringify(body));
  }
  assert.equal(await demHoaDon(), truoc, 'đầu vào sai thì không được tạo hóa đơn nào');
});

test('tạo order: sản phẩm ngừng bán -> 400, không tồn tại -> 404, khách không tồn tại -> 404, không tạo gì', async () => {
  const truoc = await demHoaDon();
  const ngung = await goi('post', '/api/hoa-don', 'rieng').send({ items: [{ ma_san_pham: 1, so_luong: 1 }, { ma_san_pham: 8, so_luong: 1 }] });
  assert.equal(ngung.status, 400);
  assert.equal(ngung.body.loi, 'SAN_PHAM_NGUNG_BAN');
  assert.match(ngung.body.thong_bao, /Croissant/);

  const khongCo = await goi('post', '/api/hoa-don', 'rieng').send({ items: [{ ma_san_pham: 99999, so_luong: 1 }] });
  assert.equal(khongCo.status, 404);

  const khach = await goi('post', '/api/hoa-don', 'rieng').send({ ma_khach_hang: 99999, items: [{ ma_san_pham: 1, so_luong: 1 }] });
  assert.equal(khach.status, 404);
  assert.match(khach.body.thong_bao, /khách hàng/);
  assert.equal(await demHoaDon(), truoc);
});

test('tạo order: không đủ nguyên liệu -> 409 kèm số liệu, tính gộp mọi dòng, không tạo hóa đơn', async () => {
  const truoc = await demHoaDon();
  // tồn 30g, mỗi ly cần 20g: 1 ly đủ
  const du = await datOrder('rieng', { items: [{ ma_san_pham: spTest, so_luong: 1 }] });
  assert.equal(du.status, 201);

  // 2 dòng, mỗi dòng 1 ly (20g, đủ nếu xét riêng) nhưng tổng 40g > 30g
  const gop = await goi('post', '/api/hoa-don', 'rieng').send({ items: [{ ma_san_pham: spTest, so_luong: 1 }, { ma_san_pham: spTest, so_luong: 1, ghi_chu: 'ly 2' }] });
  assert.equal(gop.status, 409);
  assert.equal(gop.body.loi, 'KHONG_DU_NGUYEN_LIEU');
  assert.equal(gop.body.thong_bao, 'Không đủ nguyên liệu: TEST_HD_NL cần 40 g, còn 30 g (thiếu 10 g)');
  assert.deepEqual(
    { can: gop.body.chi_tiet[0].can_dung, ton: gop.body.chi_tiet[0].so_luong_ton, thieu: gop.body.chi_tiet[0].con_thieu },
    { can: 40, ton: 30, thieu: 10 });

  // đúng ví dụ của người dùng: cần 20g mà chỉ còn 4g
  await pool.query('UPDATE NguyenLieu SET so_luong_ton = 4 WHERE ma_nguyen_lieu = ?', [nlTest]);
  const bon = await goi('post', '/api/hoa-don', 'rieng').send({ items: [{ ma_san_pham: spTest, so_luong: 1 }] });
  assert.equal(bon.status, 409);
  assert.equal(bon.body.thong_bao, 'Không đủ nguyên liệu: TEST_HD_NL cần 20 g, còn 4 g (thiếu 16 g)');
  assert.equal(await demHoaDon(), truoc + 1, 'chỉ order đủ nguyên liệu ở trên được tạo');

  // tồn kho không bị trừ khi chỉ tạo order (trừ lúc thanh toán)
  const [nl] = await pool.query('SELECT so_luong_ton FROM NguyenLieu WHERE ma_nguyen_lieu = ?', [nlTest]);
  assert.equal(nl[0].so_luong_ton, 4);
});

test('tạo order: chưa đăng nhập -> 401', async () => {
  const res = await goi('post', '/api/hoa-don').send({ items: [{ ma_san_pham: 1, so_luong: 1 }] });
  assert.equal(res.status, 401);
});

// ---------- POS-10 ----------
test('danh sách order hôm nay: có order vừa tạo, tạm tính đúng, sắp theo so_thu_tu', async () => {
  const res = await goi('get', '/api/hoa-don?moi_trang=200', 'nhanvien');
  assert.equal(res.status, 200);
  assert.equal(res.body.trang, 1);
  assert.equal(res.body.moi_trang, 200);
  assert.ok(res.body.tong_so_ban_ghi >= taoRa.length);
  const so = res.body.data.map(h => h.so_thu_tu);
  assert.deepEqual(so, [...so].sort((a, b) => a - b), 'sắp tăng dần theo so_thu_tu');

  const dau = res.body.data.find(h => h.ma_hoa_don === taoRa[0]);
  assert.equal(dau.so_mon, 4, '2 + 1 + 1 ly/phần');
  assert.equal(dau.tong_tien, 120000);
  assert.equal(dau.ten_nhan_vien, 'Lê Văn Thu Ngân');
  assert.equal(dau.trang_thai, 'dang_pha_che');
});

test('danh sách order: hóa đơn đã thanh toán hiện số tiền đã chốt; lọc theo trạng thái và nhân viên', async () => {
  const ma = taoRa[0];
  await pool.query("UPDATE HoaDon SET trang_thai = 'da_thanh_toan', tong_tien = 111111 WHERE ma_hoa_don = ?", [ma]);

  const tt = await goi('get', '/api/hoa-don?trang_thai=da_thanh_toan', 'quanly');
  const dong = tt.body.data.find(h => h.ma_hoa_don === ma);
  assert.equal(dong.tong_tien, 111111);
  assert.ok(tt.body.data.every(h => h.trang_thai === 'da_thanh_toan'));

  const huy = await goi('get', '/api/hoa-don?trang_thai=huy', 'quanly');
  assert.ok(!huy.body.data.some(h => taoRa.includes(h.ma_hoa_don)));

  const nv2 = await goi('get', '/api/hoa-don?ma_nhan_vien=2&moi_trang=200', 'admin');
  assert.ok(nv2.body.data.length >= 2);
  assert.ok(nv2.body.data.every(h => h.ma_nhan_vien === 2));
});

test('danh sách order: phân trang', async () => {
  const res = await goi('get', '/api/hoa-don?moi_trang=2&trang=2', 'admin');
  assert.equal(res.body.data.length, 2);
  assert.equal(res.body.trang, 2);
  assert.ok(res.body.tong_so_ban_ghi >= 5);
});

test('danh sách order: nhân viên chỉ xem hôm nay; quản lý xem được ngày khác; kiểm tra tham số', async () => {
  const cu = await goi('get', '/api/hoa-don?ngay=2020-01-01', 'nhanvien');
  assert.equal(cu.status, 403);
  assert.equal(cu.body.loi, 'KHONG_DU_QUYEN');

  const homNay = (await pool.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS d"))[0][0].d;
  assert.equal((await goi('get', `/api/hoa-don?ngay=${homNay}`, 'nhanvien')).status, 200, 'nhân viên xem hôm nay (chỉ định rõ ngày) vẫn được');
  const ql = await goi('get', '/api/hoa-don?ngay=2020-01-01', 'quanly');
  assert.equal(ql.status, 200);
  assert.deepEqual(ql.body.data, []);

  for (const q of ['ngay=abc', 'ngay=2026-13-45', 'ngay=2026-02-30', 'trang_thai=khac', 'ma_nhan_vien=abc', 'moi_trang=999']) {
    const res = await goi('get', `/api/hoa-don?${q}`, 'quanly');
    assert.equal(res.status, 400, q);
  }
  assert.equal((await goi('get', '/api/hoa-don')).status, 401);
});
