// Test module khach-hang: KH-01 (tạo), KH-02 (sửa), KH-03 (tìm), KH-04 (lịch sử mua) và POS-06 (gắn khách vào order).
// Dữ liệu riêng TEST_KH_*: khách TEST_KH_..., SĐT dải 0966xxxxxx (không đụng khách mẫu), danh mục TEST_KH_DM + sản phẩm TEST_KH_SP (50.000đ, KHÔNG có công thức nên không đụng kho).
process.env.JWT_SECRET = process.env.JWT_SECRET || 'khoa-chi-dung-cho-test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const pool = require('../src/config/db');
const { taoApp } = require('../src/app');
const { xoaSnapshot } = require('./_tien-ich-snapshot');

const app = taoApp();
const token = {};
const hoaDonTao = [];
let sp;
let dem = 0;
// SĐT duy nhất trong một lần chạy: 0966 + 6 chữ số tăng dần theo bộ đếm
let seq = Number(String(Date.now()).slice(-5)) * 10;
const sdt = () => `0966${String(seq++).padStart(6, '0')}`;

const goi = (pt, duong, ten = 'nhanvien') => {
  const r = request(app)[pt](duong);
  return ten ? r.set('Authorization', `Bearer ${token[ten]}`) : r;
};
const taoKhach = async (ten, so = sdt()) => {
  const res = await goi('post', '/api/khach-hang').send({ ten_khach_hang: ten, so_dien_thoai: so });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data;
};
async function taoOrder(maKhach = null) {
  const res = await goi('post', '/api/hoa-don').send({ ma_khach_hang: maKhach, items: [{ ma_san_pham: sp, so_luong: 2 }] }); // 100.000đ
  assert.equal(res.status, 201, JSON.stringify(res.body));
  hoaDonTao.push(res.body.data.ma_hoa_don);
  return res.body.data;
}
const tra = ma => goi('post', `/api/hoa-don/${ma}/thanh-toan`).send({ phuong_thuc_thanh_toan: 'tien_mat' });
const diem = async ma => (await pool.query('SELECT diem_tich_luy FROM KhachHang WHERE ma_khach_hang = ?', [ma]))[0][0].diem_tich_luy;

async function donDep() {
  const [rows] = await pool.query(`SELECT DISTINCT h.ma_hoa_don FROM HoaDon h
    LEFT JOIN KhachHang k ON k.ma_khach_hang = h.ma_khach_hang
    LEFT JOIN ChiTietHoaDon c ON c.ma_hoa_don = h.ma_hoa_don
    LEFT JOIN SanPham s ON s.ma_san_pham = c.ma_san_pham
    WHERE k.ten_khach_hang LIKE 'TEST\\_KH\\_%' OR s.ten_san_pham LIKE 'TEST\\_KH\\_%'`);
  const ids = [...new Set([...hoaDonTao, ...rows.map(r => r.ma_hoa_don)])];
  await xoaSnapshot(pool, ids);
  if (ids.length) {
    await pool.query('DELETE FROM ChiTietHoaDon WHERE ma_hoa_don IN (?)', [ids]);
    await pool.query('DELETE FROM HoaDon WHERE ma_hoa_don IN (?)', [ids]);
  }
  await pool.query("DELETE FROM SanPham WHERE ten_san_pham LIKE 'TEST\\_KH\\_%'");
  await pool.query("DELETE FROM KhachHang WHERE ten_khach_hang LIKE 'TEST\\_KH\\_%'");
  await pool.query("DELETE FROM DanhMuc WHERE ten_danh_muc LIKE 'TEST\\_KH\\_%'");
  hoaDonTao.length = 0;
}

before(async () => {
  await donDep();
  for (const [ten, mk] of [['admin', 'Admin@123'], ['quanly', 'Quanly@123'], ['nhanvien', 'Nhanvien@123']]) {
    const res = await request(app).post('/api/auth/dang-nhap').send({ ten_dang_nhap: ten, mat_khau: mk });
    token[ten] = res.body.data.token;
  }
  // Danh mục RIÊNG: không được thêm sản phẩm vào danh mục mẫu (test san-pham đếm số sản phẩm của 'Cà phê')
  const [dm] = await pool.query("INSERT INTO DanhMuc (ten_danh_muc) VALUES ('TEST_KH_DM')");
  const [r] = await pool.query("INSERT INTO SanPham (ma_danh_muc, ten_san_pham, gia_ban) VALUES (?, 'TEST_KH_SP', 50000)", [dm.insertId]);
  sp = r.insertId;
});
after(async () => {
  await donDep();
  await pool.end();
});

// ---------- KH-01 ----------
test('KH-01: mọi quyền tạo được khách, điểm bắt đầu từ 0', async () => {
  for (const ten of ['nhanvien', 'quanly', 'admin']) {
    const so = sdt();
    const res = await goi('post', '/api/khach-hang', ten).send({ ten_khach_hang: `  TEST_KH_tao_${ten}  `, so_dien_thoai: so });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.ten_khach_hang, `TEST_KH_tao_${ten}`, 'tên được cắt khoảng trắng');
    assert.equal(res.body.data.so_dien_thoai, so);
    assert.equal(res.body.data.diem_tich_luy, 0);
    assert.ok(res.body.data.ma_khach_hang > 0);
  }
});

test('KH-01: trùng SĐT -> 409 TRUNG_SDT; chưa đăng nhập -> 401', async () => {
  const so = sdt();
  await taoKhach('TEST_KH_trung', so);
  const res = await goi('post', '/api/khach-hang').send({ ten_khach_hang: 'TEST_KH_trung2', so_dien_thoai: so });
  assert.equal(res.status, 409);
  assert.equal(res.body.loi, 'TRUNG_SDT');
  const chuaDn = await goi('post', '/api/khach-hang', null).send({ ten_khach_hang: 'TEST_KH_x', so_dien_thoai: sdt() });
  assert.equal(chuaDn.status, 401);
});

test('KH-01: đầu vào sai -> 400 (SĐT sai định dạng, tên rỗng, thiếu trường, gửi điểm)', async () => {
  const gui = body => goi('post', '/api/khach-hang').send(body);
  for (const body of [
    { ten_khach_hang: 'TEST_KH_a', so_dien_thoai: '12345' },
    { ten_khach_hang: 'TEST_KH_a', so_dien_thoai: '09661234abc' },
    { ten_khach_hang: 'TEST_KH_a', so_dien_thoai: '1966123456' },
    { ten_khach_hang: 'TEST_KH_a', so_dien_thoai: 966123456 },
    { ten_khach_hang: '   ', so_dien_thoai: sdt() },
    { ten_khach_hang: 'TEST_KH_a' },
    { so_dien_thoai: sdt() },
    { ten_khach_hang: 'TEST_KH_a', so_dien_thoai: sdt(), diem_tich_luy: 500 },
  ]) {
    const res = await gui(body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(res.body.loi, 'DU_LIEU_SAI');
  }
  const [r] = await pool.query("SELECT COUNT(*) AS n FROM KhachHang WHERE ten_khach_hang = 'TEST_KH_a'");
  assert.equal(r[0].n, 0, 'đầu vào sai không được tạo gì');
});

// ---------- KH-03 ----------
test('KH-03: tìm theo tên (không phân biệt dấu/hoa thường) và theo SĐT một phần', async () => {
  const so = sdt();
  const k = await taoKhach('TEST_KH_Nguyễn Tìm', so);
  const theoTen = await goi('get', '/api/khach-hang?tu_khoa=' + encodeURIComponent('test_kh_nguyen tim'));
  assert.equal(theoTen.status, 200);
  assert.deepEqual(theoTen.body.data.map(x => x.ma_khach_hang), [k.ma_khach_hang]);
  assert.deepEqual(Object.keys(theoTen.body.data[0]).sort(), ['diem_tich_luy', 'ma_khach_hang', 'so_dien_thoai', 'ten_khach_hang']);
  const theoSdt = await goi('get', `/api/khach-hang?tu_khoa=${so.slice(3)}`);
  assert.ok(theoSdt.body.data.some(x => x.ma_khach_hang === k.ma_khach_hang));
  const khongCo = await goi('get', '/api/khach-hang?tu_khoa=TEST_KH_khong_ton_tai_zzz');
  assert.deepEqual(khongCo.body.data, []);
});

test('KH-03: tối đa 20 kết quả; % và _ là ký tự thường; thiếu/rỗng tu_khoa -> 400', async () => {
  for (let i = 0; i < 22; i++) await taoKhach(`TEST_KH_LIM_${String(i).padStart(2, '0')}`);
  const res = await goi('get', '/api/khach-hang?tu_khoa=TEST_KH_LIM_');
  assert.equal(res.body.data.length, 20);
  const dauPhanTram = await goi('get', '/api/khach-hang?tu_khoa=' + encodeURIComponent('%'));
  assert.equal(dauPhanTram.status, 200);
  assert.ok(dauPhanTram.body.data.every(x => x.ten_khach_hang.includes('%') || x.so_dien_thoai.includes('%')), '% không được khớp mọi khách');
  for (const url of ['/api/khach-hang', '/api/khach-hang?tu_khoa=', '/api/khach-hang?tu_khoa=%20%20']) {
    assert.equal((await goi('get', url)).status, 400, url);
  }
});

// ---------- KH-02 ----------
test('KH-02: admin/quản lý sửa tên và SĐT; nhân viên 403', async () => {
  const k = await taoKhach('TEST_KH_sua');
  const moi = sdt();
  const a = await goi('patch', `/api/khach-hang/${k.ma_khach_hang}`, 'quanly').send({ ten_khach_hang: 'TEST_KH_sua_moi', so_dien_thoai: moi });
  assert.equal(a.status, 200, JSON.stringify(a.body));
  assert.equal(a.body.data.ten_khach_hang, 'TEST_KH_sua_moi');
  assert.equal(a.body.data.so_dien_thoai, moi);
  const b = await goi('patch', `/api/khach-hang/${k.ma_khach_hang}`, 'admin').send({ ten_khach_hang: 'TEST_KH_sua_admin' });
  assert.equal(b.status, 200);
  assert.equal(b.body.data.so_dien_thoai, moi, 'không gửi SĐT thì giữ nguyên');
  const c = await goi('patch', `/api/khach-hang/${k.ma_khach_hang}`, 'nhanvien').send({ ten_khach_hang: 'TEST_KH_hack' });
  assert.equal(c.status, 403);
  const giuNguyenSdt = await goi('patch', `/api/khach-hang/${k.ma_khach_hang}`, 'admin').send({ so_dien_thoai: moi });
  assert.equal(giuNguyenSdt.status, 200, 'đặt lại đúng SĐT của chính mình không bị coi là trùng');
});

test('KH-02: trùng SĐT khách khác -> 409; không sửa được điểm; rỗng/404 -> 400/404', async () => {
  const a = await taoKhach('TEST_KH_a1');
  const b = await taoKhach('TEST_KH_b1');
  const trung = await goi('patch', `/api/khach-hang/${b.ma_khach_hang}`, 'admin').send({ so_dien_thoai: a.so_dien_thoai });
  assert.equal(trung.status, 409);
  assert.equal(trung.body.loi, 'TRUNG_SDT');
  const diemRes = await goi('patch', `/api/khach-hang/${b.ma_khach_hang}`, 'admin').send({ diem_tich_luy: 9999 });
  assert.equal(diemRes.status, 400);
  const ketHop = await goi('patch', `/api/khach-hang/${b.ma_khach_hang}`, 'admin').send({ ten_khach_hang: 'TEST_KH_b2', diem_tich_luy: 9999 });
  assert.equal(ketHop.status, 400);
  assert.equal(await diem(b.ma_khach_hang), 0, 'điểm không đổi');
  assert.equal((await pool.query('SELECT ten_khach_hang AS t FROM KhachHang WHERE ma_khach_hang = ?', [b.ma_khach_hang]))[0][0].t, 'TEST_KH_b1', 'yêu cầu sai thì không đổi gì');
  assert.equal((await goi('patch', `/api/khach-hang/${b.ma_khach_hang}`, 'admin').send({})).status, 400);
  assert.equal((await goi('patch', `/api/khach-hang/${b.ma_khach_hang}`, 'admin').send({ so_dien_thoai: 'abc' })).status, 400);
  assert.equal((await goi('patch', '/api/khach-hang/999999999', 'admin').send({ ten_khach_hang: 'TEST_KH_x' })).status, 404);
});

// ---------- POS-06 ----------
test('POS-06: gắn khách theo SĐT, đổi được khách khi order còn mở', async () => {
  const k1 = await taoKhach('TEST_KH_gan1');
  const k2 = await taoKhach('TEST_KH_gan2');
  const hd = await taoOrder();
  assert.equal(hd.ma_khach_hang, null);
  const r1 = await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/khach-hang`).send({ so_dien_thoai: k1.so_dien_thoai });
  assert.equal(r1.status, 200, JSON.stringify(r1.body));
  assert.deepEqual(r1.body.data, { ma_khach_hang: k1.ma_khach_hang, ten_khach_hang: 'TEST_KH_gan1', diem_tich_luy: 0 });
  assert.equal((await goi('get', `/api/hoa-don/${hd.ma_hoa_don}`)).body.data.ma_khach_hang, k1.ma_khach_hang);
  const r2 = await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/khach-hang`).send({ so_dien_thoai: k2.so_dien_thoai });
  assert.equal(r2.status, 200);
  assert.equal((await goi('get', `/api/hoa-don/${hd.ma_hoa_don}`)).body.data.ma_khach_hang, k2.ma_khach_hang);
});

test('POS-06: lỗi: SĐT chưa có 404, sai định dạng 400, order không có 404, order đã đóng 409', async () => {
  const k = await taoKhach('TEST_KH_gan3');
  const hd = await taoOrder();
  const chuaCo = await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/khach-hang`).send({ so_dien_thoai: sdt() });
  assert.equal(chuaCo.status, 404);
  assert.match(chuaCo.body.thong_bao, /tạo khách mới/);
  assert.equal((await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/khach-hang`).send({ so_dien_thoai: '123' })).status, 400);
  assert.equal((await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/khach-hang`).send({})).status, 400);
  assert.equal((await goi('post', '/api/hoa-don/999999999/khach-hang').send({ so_dien_thoai: k.so_dien_thoai })).status, 404);
  assert.equal((await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/khach-hang`, null).send({ so_dien_thoai: k.so_dien_thoai })).status, 401);
  assert.equal((await goi('get', `/api/hoa-don/${hd.ma_hoa_don}`)).body.data.ma_khach_hang, null, 'lỗi thì không gắn gì');

  assert.equal((await tra(hd.ma_hoa_don)).status, 200);
  const daTra = await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/khach-hang`).send({ so_dien_thoai: k.so_dien_thoai });
  assert.equal(daTra.status, 409);
  assert.equal(daTra.body.loi, 'HOA_DON_DA_DONG');

  const hd2 = await taoOrder();
  assert.equal((await goi('post', `/api/hoa-don/${hd2.ma_hoa_don}/huy`).send({})).status, 200);
  assert.equal((await goi('post', `/api/hoa-don/${hd2.ma_hoa_don}/khach-hang`).send({ so_dien_thoai: k.so_dien_thoai })).status, 409);
});

test('POS-06: thanh toán cộng điểm cho khách đang được gắn (không phải khách cũ)', async () => {
  const k1 = await taoKhach('TEST_KH_diem1');
  const k2 = await taoKhach('TEST_KH_diem2');
  const hd = await taoOrder(k1.ma_khach_hang); // 100.000đ -> 10 điểm
  await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/khach-hang`).send({ so_dien_thoai: k2.so_dien_thoai });
  const res = await tra(hd.ma_hoa_don);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.diem_cong, 10);
  assert.equal(await diem(k2.ma_khach_hang), 10);
  assert.equal(await diem(k1.ma_khach_hang), 0);
});

// ---------- KH-04 ----------
test('KH-04: chỉ hóa đơn đã thanh toán của đúng khách, kèm tổng chi tiêu; nhân viên 403; 404', async () => {
  const k = await taoKhach('TEST_KH_ls');
  const khac = await taoKhach('TEST_KH_ls_khac');
  const a = await taoOrder(k.ma_khach_hang);
  const b = await taoOrder(k.ma_khach_hang);
  const chuaTra = await taoOrder(k.ma_khach_hang);
  const huy = await taoOrder(k.ma_khach_hang);
  const cuaKhac = await taoOrder(khac.ma_khach_hang);
  assert.equal((await goi('post', `/api/hoa-don/${huy.ma_hoa_don}/huy`).send({})).status, 200);
  for (const hd of [a, b, cuaKhac]) assert.equal((await tra(hd.ma_hoa_don)).status, 200);

  const res = await goi('get', `/api/khach-hang/${k.ma_khach_hang}/lich-su`, 'quanly');
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.deepEqual(res.body.data.map(h => h.ma_hoa_don).sort(), [a.ma_hoa_don, b.ma_hoa_don].sort());
  assert.ok(!res.body.data.some(h => [chuaTra, huy, cuaKhac].some(x => x.ma_hoa_don === h.ma_hoa_don)));
  assert.equal(res.body.tong_chi_tieu, 200000);
  assert.equal(res.body.tong_so_ban_ghi, 2);
  assert.equal(res.body.khach_hang.ma_khach_hang, k.ma_khach_hang);
  assert.equal(res.body.data[0].tong_tien, 100000);
  assert.equal(res.body.data[0].phuong_thuc_thanh_toan, 'tien_mat');

  assert.equal((await goi('get', `/api/khach-hang/${k.ma_khach_hang}/lich-su`, 'admin')).status, 200);
  assert.equal((await goi('get', `/api/khach-hang/${k.ma_khach_hang}/lich-su`, 'nhanvien')).status, 403);
  assert.equal((await goi('get', '/api/khach-hang/999999999/lich-su', 'admin')).status, 404);
  const trong = await goi('get', `/api/khach-hang/${(await taoKhach('TEST_KH_ls_trong')).ma_khach_hang}/lich-su`, 'admin');
  assert.deepEqual(trong.body.data, []);
  assert.equal(trong.body.tong_chi_tieu, 0);
});

test('KH-04: lọc ngày theo ngày thanh toán (gồm cả hai đầu), phân trang không làm sai tổng, đầu vào sai 400', async () => {
  const k = await taoKhach('TEST_KH_ls2');
  const ids = [];
  for (let i = 0; i < 3; i++) { const hd = await taoOrder(k.ma_khach_hang); await tra(hd.ma_hoa_don); ids.push(hd.ma_hoa_don); }
  const [[{ hom }]] = await pool.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS hom");
  const [[{ hqua }]] = await pool.query("SELECT DATE_FORMAT(CURDATE() - INTERVAL 1 DAY, '%Y-%m-%d') AS hqua");
  const duong = q => `/api/khach-hang/${k.ma_khach_hang}/lich-su${q}`;

  assert.equal((await goi('get', duong(`?tu_ngay=${hom}&den_ngay=${hom}`), 'admin')).body.tong_so_ban_ghi, 3, 'ngày hôm nay gồm cả hai đầu');
  const homQua = await goi('get', duong(`?den_ngay=${hqua}`), 'admin');
  assert.equal(homQua.body.tong_so_ban_ghi, 0);
  assert.equal(homQua.body.tong_chi_tieu, 0);
  assert.equal((await goi('get', duong(`?tu_ngay=${hqua}`), 'admin')).body.tong_so_ban_ghi, 3);

  const trang1 = await goi('get', duong('?moi_trang=2&trang=1'), 'admin');
  const trang2 = await goi('get', duong('?moi_trang=2&trang=2'), 'admin');
  assert.equal(trang1.body.data.length, 2);
  assert.equal(trang2.body.data.length, 1);
  assert.equal(trang1.body.tong_chi_tieu, 300000, 'tổng chi tiêu tính trên cả kết quả, không chỉ trang hiện tại');
  assert.equal(trang1.body.tong_so_ban_ghi, 3);

  for (const q of ['?tu_ngay=2026-13-45', '?tu_ngay=abc', `?tu_ngay=${hom}&den_ngay=${hqua}`, '?moi_trang=0']) {
    assert.equal((await goi('get', duong(q), 'admin')).status, 400, q);
  }
});

// ---------- POS-08 đồng thời trên cùng một khách ----------
test('thanh toán đồng thời 2 hóa đơn của CÙNG một khách: cả hai thành công, điểm cộng đủ (không deadlock)', async () => {
  const k = await taoKhach('TEST_KH_dongthoi');
  const VONG = 12;
  for (let i = 0; i < VONG; i++) {
    const a = await taoOrder(k.ma_khach_hang); // mỗi hóa đơn 100.000đ = 10 điểm
    const b = await taoOrder(k.ma_khach_hang);
    const [ra, rb] = await Promise.all([tra(a.ma_hoa_don), tra(b.ma_hoa_don)]);
    assert.equal(ra.status, 200, `vòng ${i}: ${JSON.stringify(ra.body)}`);
    assert.equal(rb.status, 200, `vòng ${i}: ${JSON.stringify(rb.body)}`);
  }
  assert.equal(await diem(k.ma_khach_hang), VONG * 2 * 10);
});
