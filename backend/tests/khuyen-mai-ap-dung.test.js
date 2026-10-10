// Test 7b: khuyến mãi TỰ ÁP vào menu và order (nhiều mã cộng dồn trên giá gốc, tính trên từng ly) + KM-07 báo cáo hiệu quả.
// Dữ liệu riêng TEST_AD_*: danh mục TEST_AD_DM, mỗi test dùng sản phẩm RIÊNG (không công thức nên không đụng kho) và khuyến mãi RIÊNG,
// để không bị khuyến mãi của test khác cộng dồn vào. Không đụng 3 khuyến mãi mẫu.
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
let maDm; let dem = 0;

const goi = (pt, duong, ten = 'quanly') => {
  const r = request(app)[pt](duong);
  return ten ? r.set('Authorization', `Bearer ${token[ten]}`) : r;
};
const luc = (ngay, gio = 0) => new Date(Date.now() + (ngay * 24 + gio) * 3600 * 1000).toISOString();
const ten = ts => `TEST_AD_${ts}_${Date.now()}_${dem++}`;

async function taoSp(gia) {
  const t = ten('SP');
  const [r] = await pool.query('INSERT INTO SanPham (ma_danh_muc, ten_san_pham, gia_ban) VALUES (?, ?, ?)', [maDm, t, gia]);
  return { ma: r.insertId, ten: t };
}
// loai: 'phan_tram' | 'so_tien'; ghiDe: ngày...
async function taoKm(loai, giaTri, dsSp, ghiDe = {}) {
  const res = await goi('post', '/api/khuyen-mai').send({
    ten_khuyen_mai: ten('KM'), loai_giam: loai, gia_tri_giam: giaTri,
    ngay_bat_dau: luc(-1), ngay_ket_thuc: luc(30), ma_san_pham: dsSp, ...ghiDe,
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data;
}
async function menuCua(sp) {
  const res = await goi('get', `/api/san-pham/menu?tu_khoa=${encodeURIComponent(sp.ten)}`, 'nhanvien');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 1);
  return res.body.data[0];
}
async function datHang(items, maKhach = null) {
  const res = await goi('post', '/api/hoa-don', 'nhanvien').send({ ma_khach_hang: maKhach, items });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  hoaDonTao.push(res.body.data.ma_hoa_don);
  return res.body.data;
}
const tra = ma => goi('post', `/api/hoa-don/${ma}/thanh-toan`, 'nhanvien').send({ phuong_thuc_thanh_toan: 'tien_mat' });
const xemHd = async ma => (await goi('get', `/api/hoa-don/${ma}`, 'nhanvien')).body.data;
const bangCtkm = async maCt => (await pool.query('SELECT ma_khuyen_mai, muc_giam_moi_ly FROM ChiTietHoaDonKhuyenMai WHERE ma_chi_tiet = ? ORDER BY ma_khuyen_mai', [maCt]))[0];

async function donDep() {
  const [rows] = await pool.query(`SELECT DISTINCT c.ma_hoa_don FROM ChiTietHoaDon c JOIN SanPham s ON s.ma_san_pham = c.ma_san_pham
    WHERE s.ten_san_pham LIKE 'TEST\\_AD\\_%'`);
  const [kh] = await pool.query("SELECT ma_khach_hang FROM KhachHang WHERE ten_khach_hang LIKE 'TEST\\_AD\\_%'");
  const ids = [...new Set([...hoaDonTao, ...rows.map(r => r.ma_hoa_don)])];
  await xoaSnapshot(pool, ids);
  if (ids.length) {
    await pool.query('DELETE FROM ChiTietHoaDon WHERE ma_hoa_don IN (?)', [ids]); // ChiTietHoaDonKhuyenMai xóa theo (CASCADE)
    await pool.query('DELETE FROM HoaDon WHERE ma_hoa_don IN (?)', [ids]);
  }
  await pool.query("DELETE kmsp FROM KhuyenMaiSanPham kmsp JOIN KhuyenMai km ON km.ma_khuyen_mai = kmsp.ma_khuyen_mai WHERE km.ten_khuyen_mai LIKE 'TEST\\_AD\\_%'");
  await pool.query("DELETE FROM KhuyenMai WHERE ten_khuyen_mai LIKE 'TEST\\_AD\\_%'");
  await pool.query("DELETE FROM SanPham WHERE ten_san_pham LIKE 'TEST\\_AD\\_%'");
  if (kh.length) await pool.query('DELETE FROM KhachHang WHERE ma_khach_hang IN (?)', [kh.map(k => k.ma_khach_hang)]);
  await pool.query("DELETE FROM DanhMuc WHERE ten_danh_muc LIKE 'TEST\\_AD\\_%'");
  hoaDonTao.length = 0;
}

before(async () => {
  await donDep();
  for (const [t, mk] of [['admin', 'Admin@123'], ['quanly', 'Quanly@123'], ['nhanvien', 'Nhanvien@123']]) {
    const res = await request(app).post('/api/auth/dang-nhap').send({ ten_dang_nhap: t, mat_khau: mk });
    token[t] = res.body.data.token;
  }
  maDm = (await pool.query("INSERT INTO DanhMuc (ten_danh_muc) VALUES ('TEST_AD_DM')"))[0].insertId;
});
after(async () => {
  await donDep();
  await pool.end();
});

// ---------- Menu (POS-01) ----------
test('menu: không có khuyến mãi -> gia_sau_giam = gia_ban; khuyến mãi sắp diễn ra / hết hạn không được áp', async () => {
  const sp = await taoSp(40000);
  let m = await menuCua(sp);
  assert.deepEqual([m.gia_ban, m.gia_sau_giam, m.tong_giam_moi_ly, m.khuyen_mai], [40000, 40000, 0, []]);
  await taoKm('phan_tram', 50, [sp.ma], { ngay_bat_dau: luc(2), ngay_ket_thuc: luc(5) });
  await taoKm('phan_tram', 50, [sp.ma], { ngay_bat_dau: luc(-5), ngay_ket_thuc: luc(-2) });
  m = await menuCua(sp);
  assert.equal(m.gia_sau_giam, 40000);
  assert.deepEqual(m.khuyen_mai, []);
});

test('menu: phần trăm và số tiền, làm tròn XUỐNG đồng nguyên trên từng ly', async () => {
  const sp = await taoSp(33333);
  const km = await taoKm('phan_tram', 10, [sp.ma]); // 3333.3 -> 3333
  let m = await menuCua(sp);
  assert.equal(m.tong_giam_moi_ly, 3333);
  assert.equal(m.gia_sau_giam, 30000);
  assert.deepEqual(m.khuyen_mai, [{ ma_khuyen_mai: km.ma_khuyen_mai, ten_khuyen_mai: km.ten_khuyen_mai, muc_giam_moi_ly: 3333 }]);
  const sp2 = await taoSp(33333);
  await taoKm('phan_tram', 12.5, [sp2.ma]); // 4166.625 -> 4166
  assert.equal((await menuCua(sp2)).tong_giam_moi_ly, 4166);
  const sp3 = await taoSp(33333);
  await taoKm('so_tien', 1500.9, [sp3.ma]); // -> 1500
  assert.equal((await menuCua(sp3)).gia_sau_giam, 31833);
});

test('menu: NHIỀU khuyến mãi cộng dồn trên GIÁ GỐC, theo thứ tự mã tăng dần', async () => {
  const sp = await taoSp(100000);
  const a = await taoKm('phan_tram', 10, [sp.ma]); // 10.000
  const b = await taoKm('so_tien', 5000, [sp.ma]); //  5.000
  const c = await taoKm('phan_tram', 20, [sp.ma]); // 20.000 trên 100.000 (không phải trên giá đã giảm)
  const m = await menuCua(sp);
  assert.deepEqual(m.khuyen_mai.map(k => [k.ma_khuyen_mai, k.muc_giam_moi_ly]), [[a.ma_khuyen_mai, 10000], [b.ma_khuyen_mai, 5000], [c.ma_khuyen_mai, 20000]]);
  assert.equal(m.tong_giam_moi_ly, 35000);
  assert.equal(m.gia_sau_giam, 65000);
});

test('menu: tổng giảm không vượt giá bán — mã cuối bị cắt phần dư, mã không còn gì để giảm thì không ghi', async () => {
  const sp = await taoSp(20000);
  const a = await taoKm('phan_tram', 80, [sp.ma]); // 16.000
  const b = await taoKm('so_tien', 5000, [sp.ma]); // chỉ còn 4.000
  const c = await taoKm('so_tien', 1000, [sp.ma]); // hết để giảm
  const m = await menuCua(sp);
  assert.deepEqual(m.khuyen_mai.map(k => [k.ma_khuyen_mai, k.muc_giam_moi_ly]), [[a.ma_khuyen_mai, 16000], [b.ma_khuyen_mai, 4000]]);
  assert.ok(!m.khuyen_mai.some(k => k.ma_khuyen_mai === c.ma_khuyen_mai));
  assert.equal(m.gia_sau_giam, 0);
  const hd = await datHang([{ ma_san_pham: sp.ma, so_luong: 3 }]);
  assert.equal(hd.chi_tiet[0].giam_gia, 60000);
  assert.equal(hd.tong_tien_tam_tinh, 0);
  assert.equal((await tra(hd.ma_hoa_don)).status, 200, 'hóa đơn 0đ vẫn thanh toán được');
});

test('menu: đổi khuyến mãi (KM-02) và gỡ sản phẩm (KM-05) có hiệu lực ngay trên menu', async () => {
  const sp = await taoSp(50000);
  const km = await taoKm('so_tien', 5000, [sp.ma]);
  assert.equal((await menuCua(sp)).gia_sau_giam, 45000);
  await goi('patch', `/api/khuyen-mai/${km.ma_khuyen_mai}`).send({ gia_tri_giam: 8000 });
  assert.equal((await menuCua(sp)).gia_sau_giam, 42000);
  await goi('patch', `/api/khuyen-mai/${km.ma_khuyen_mai}`).send({ ngay_ket_thuc: new Date(Date.now() - 1000).toISOString() });
  assert.equal((await menuCua(sp)).gia_sau_giam, 50000, 'kết thúc sớm = ngừng áp');
  await goi('patch', `/api/khuyen-mai/${km.ma_khuyen_mai}`).send({ ngay_ket_thuc: luc(3) });
  assert.equal((await menuCua(sp)).gia_sau_giam, 42000);
  await goi('delete', `/api/khuyen-mai/${km.ma_khuyen_mai}/san-pham/${sp.ma}`);
  assert.equal((await menuCua(sp)).gia_sau_giam, 50000);
});

// ---------- Order (POS-02/03/04/05/11) ----------
test('tạo order: mức giảm TỪNG DÒNG tự áp, snapshot từng mã trên từng ly; dòng không có khuyến mãi giữ nguyên giá', async () => {
  const spA = await taoSp(100000);
  const spB = await taoSp(30000); // không khuyến mãi
  const a = await taoKm('phan_tram', 10, [spA.ma]);
  const b = await taoKm('so_tien', 5000, [spA.ma]);
  const hd = await datHang([
    { ma_san_pham: spA.ma, so_luong: 2 },
    { ma_san_pham: spB.ma, so_luong: 1 },
    { ma_san_pham: spA.ma, so_luong: 3, ghi_chu: 'ít đá' }, // cùng sản phẩm, dòng khác: vẫn áp riêng
  ]);
  const [d1, d2, d3] = hd.chi_tiet;
  assert.equal(d1.don_gia, 100000);
  assert.equal(d1.giam_gia, 30000); // 2 ly x 15.000
  assert.equal(d1.thanh_tien, 170000);
  assert.deepEqual(d1.khuyen_mai, [
    { ma_khuyen_mai: a.ma_khuyen_mai, ten_khuyen_mai: a.ten_khuyen_mai, muc_giam_moi_ly: 10000 },
    { ma_khuyen_mai: b.ma_khuyen_mai, ten_khuyen_mai: b.ten_khuyen_mai, muc_giam_moi_ly: 5000 },
  ]);
  assert.equal(d2.giam_gia, 0);
  assert.deepEqual(d2.khuyen_mai, []);
  assert.equal(d3.giam_gia, 45000); // 3 ly x 15.000
  assert.equal(hd.tong_tien_hang, 200000 + 30000 + 300000);
  assert.equal(hd.tong_giam_gia, 75000);
  assert.equal(hd.tong_tien_tam_tinh, 455000);
  assert.deepEqual((await bangCtkm(d1.ma_chi_tiet)).map(r => [r.ma_khuyen_mai, r.muc_giam_moi_ly]), [[a.ma_khuyen_mai, 10000], [b.ma_khuyen_mai, 5000]]);
  assert.equal((await bangCtkm(d2.ma_chi_tiet)).length, 0);
  // POS-11 trả cùng thông tin; POS-10 danh sách ra tiền đã giảm
  const xem = await xemHd(hd.ma_hoa_don);
  assert.deepEqual(xem.chi_tiet.map(d => d.khuyen_mai.length), [2, 0, 2]);
  assert.equal(xem.tong_tien_tam_tinh, 455000);
  const ds = (await goi('get', '/api/hoa-don?moi_trang=200', 'nhanvien')).body.data.find(h => h.ma_hoa_don === hd.ma_hoa_don);
  assert.equal(ds.tong_tien, 455000);
});

test('POS-03 thêm món: dùng khuyến mãi HIỆN TẠI; order đang mở GIỮ mức giảm đã chụp khi khuyến mãi bị sửa', async () => {
  const sp = await taoSp(100000);
  const km = await taoKm('phan_tram', 10, [sp.ma]);
  const hd = await datHang([{ ma_san_pham: sp.ma, so_luong: 2 }]);
  assert.equal(hd.chi_tiet[0].giam_gia, 20000);
  await goi('patch', `/api/khuyen-mai/${km.ma_khuyen_mai}`).send({ gia_tri_giam: 30 });
  const them = await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/dong`, 'nhanvien').send({ ma_san_pham: sp.ma, so_luong: 1 });
  assert.equal(them.status, 201, JSON.stringify(them.body));
  const [cu, moi] = them.body.data.chi_tiet;
  assert.equal(cu.giam_gia, 20000, 'dòng cũ giữ snapshot 10%');
  assert.equal(cu.khuyen_mai[0].muc_giam_moi_ly, 10000);
  assert.equal(moi.giam_gia, 30000, 'dòng mới theo 30%');
  assert.equal(moi.khuyen_mai[0].muc_giam_moi_ly, 30000);
  assert.equal(them.body.data.tong_tien_tam_tinh, 300000 - 50000);
});

test('POS-04 sửa số lượng: giam_gia = số ly mới x mức giảm mỗi ly ĐÃ CHỤP (kể cả khi khuyến mãi đã đổi/hết hạn)', async () => {
  const sp = await taoSp(100000);
  const a = await taoKm('phan_tram', 10, [sp.ma]);
  await taoKm('so_tien', 2500, [sp.ma]);
  const hd = await datHang([{ ma_san_pham: sp.ma, so_luong: 2 }, { ma_san_pham: sp.ma, so_luong: 1, ghi_chu: 'x' }]);
  const dong = hd.chi_tiet[0];
  assert.equal(dong.giam_gia, 25000); // 2 x 12.500
  await goi('patch', `/api/khuyen-mai/${a.ma_khuyen_mai}`).send({ gia_tri_giam: 90, ngay_ket_thuc: new Date(Date.now() - 1000).toISOString() }); // đổi + hết hạn
  const tang = await goi('patch', `/api/hoa-don/${hd.ma_hoa_don}/dong/${dong.ma_chi_tiet}`, 'nhanvien').send({ so_luong: 5 });
  assert.equal(tang.status, 200, JSON.stringify(tang.body));
  assert.equal(tang.body.data.chi_tiet[0].giam_gia, 62500); // 5 x 12.500
  assert.equal(tang.body.data.chi_tiet[0].thanh_tien, 437500);
  const giam = await goi('patch', `/api/hoa-don/${hd.ma_hoa_don}/dong/${dong.ma_chi_tiet}`, 'nhanvien').send({ so_luong: 1 });
  assert.equal(giam.body.data.chi_tiet[0].giam_gia, 12500);
  assert.equal(giam.body.data.chi_tiet[0].khuyen_mai.length, 2, 'danh sách mã đã chụp giữ nguyên');
  const ghiChu = await goi('patch', `/api/hoa-don/${hd.ma_hoa_don}/dong/${dong.ma_chi_tiet}`, 'nhanvien').send({ ghi_chu: 'ít ngọt' });
  assert.equal(ghiChu.body.data.chi_tiet[0].giam_gia, 12500, 'đổi ghi chú không đổi giảm giá');
});

test('POS-05 xóa dòng: mức giảm của dòng xóa theo; POS-09 hủy: giữ dữ liệu nhưng không tính vào lượt dùng', async () => {
  const sp = await taoSp(100000);
  const km = await taoKm('phan_tram', 10, [sp.ma]);
  const hd = await datHang([{ ma_san_pham: sp.ma, so_luong: 2 }, { ma_san_pham: sp.ma, so_luong: 1, ghi_chu: 'y' }]);
  const [d1, d2] = hd.chi_tiet;
  assert.equal((await goi('delete', `/api/hoa-don/${hd.ma_hoa_don}/dong/${d1.ma_chi_tiet}`, 'nhanvien')).status, 200);
  assert.equal((await bangCtkm(d1.ma_chi_tiet)).length, 0);
  assert.equal((await bangCtkm(d2.ma_chi_tiet)).length, 1);
  assert.equal((await goi('get', `/api/khuyen-mai/${km.ma_khuyen_mai}`)).body.data.so_luot_dung, 1);
  assert.equal((await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/huy`, 'nhanvien').send({})).status, 200);
  assert.equal((await bangCtkm(d2.ma_chi_tiet)).length, 1, 'hủy order giữ dữ liệu');
  assert.equal((await goi('get', `/api/khuyen-mai/${km.ma_khuyen_mai}`)).body.data.so_luot_dung, 0);
});

test('POS-08 thanh toán: tổng tiền, snapshot HoaDonDaThanhToan và điểm tích lũy tính trên số tiền SAU giảm', async () => {
  const sp = await taoSp(100000);
  await taoKm('phan_tram', 10, [sp.ma]);
  await taoKm('so_tien', 5000, [sp.ma]);
  const sdt = `0955${String(Date.now()).slice(-6)}`;
  const kh = (await goi('post', '/api/khach-hang', 'nhanvien').send({ ten_khach_hang: ten('KH'), so_dien_thoai: sdt })).body.data;
  const hd = await datHang([{ ma_san_pham: sp.ma, so_luong: 3 }], kh.ma_khach_hang); // 300.000 - 45.000 = 255.000
  const res = await tra(hd.ma_hoa_don);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.hoa_don.tong_tien, 255000);
  assert.equal(res.body.data.diem_cong, 25); // FLOOR(255000 / 10000)
  const [[s]] = await pool.query('SELECT tong_tien_hang, tong_giam_gia, tong_tien, diem_cong FROM HoaDonDaThanhToan WHERE ma_hoa_don = ?', [hd.ma_hoa_don]);
  assert.deepEqual([s.tong_tien_hang, s.tong_giam_gia, s.tong_tien, s.diem_cong], [300000, 45000, 255000, 25]);
});

// ---------- KM-07 ----------
test('KM-07: chỉ hóa đơn ĐÃ THANH TOÁN; số ly, tiền giảm của RIÊNG từng mã, doanh thu các dòng có áp mã', async () => {
  const sp = await taoSp(100000);
  const a = await taoKm('phan_tram', 10, [sp.ma]); // 10.000 / ly
  const b = await taoKm('so_tien', 5000, [sp.ma]); //  5.000 / ly
  const trong = await taoKm('so_tien', 1000, []); // chưa ai dùng
  const o1 = await datHang([{ ma_san_pham: sp.ma, so_luong: 2 }]);
  const o2 = await datHang([{ ma_san_pham: sp.ma, so_luong: 4 }]); // chưa thanh toán
  const o3 = await datHang([{ ma_san_pham: sp.ma, so_luong: 5 }]); // hủy
  const o4 = await datHang([{ ma_san_pham: sp.ma, so_luong: 1 }]);
  await goi('post', `/api/hoa-don/${o3.ma_hoa_don}/huy`, 'nhanvien').send({});
  assert.equal((await tra(o1.ma_hoa_don)).status, 200);
  assert.equal((await tra(o4.ma_hoa_don)).status, 200);
  assert.ok(o2.ma_hoa_don);

  const ra = await goi('get', `/api/khuyen-mai/${a.ma_khuyen_mai}/bao-cao`);
  assert.equal(ra.status, 200, JSON.stringify(ra.body));
  assert.deepEqual(ra.body.data, {
    ma_khuyen_mai: a.ma_khuyen_mai, ten_khuyen_mai: a.ten_khuyen_mai, tu_ngay: null, den_ngay: null,
    so_hoa_don: 2, so_luong_ban: 3, tong_tien_giam: 30000, doanh_thu_sau_giam: 3 * 85000,
  });
  const rb = await goi('get', `/api/khuyen-mai/${b.ma_khuyen_mai}/bao-cao`, 'admin');
  assert.deepEqual([rb.body.data.so_luong_ban, rb.body.data.tong_tien_giam, rb.body.data.doanh_thu_sau_giam], [3, 15000, 255000], 'mã B: tiền giảm riêng, doanh thu dòng dùng chung');
  const rt = await goi('get', `/api/khuyen-mai/${trong.ma_khuyen_mai}/bao-cao`);
  assert.deepEqual([rt.body.data.so_hoa_don, rt.body.data.so_luong_ban, rt.body.data.tong_tien_giam, rt.body.data.doanh_thu_sau_giam], [0, 0, 0, 0]);

  // lọc ngày THANH TOÁN (hôm nay, gồm cả hai đầu)
  const [[{ hom }]] = await pool.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS hom");
  const [[{ hqua }]] = await pool.query("SELECT DATE_FORMAT(CURDATE() - INTERVAL 1 DAY, '%Y-%m-%d') AS hqua");
  const [[{ mai }]] = await pool.query("SELECT DATE_FORMAT(CURDATE() + INTERVAL 1 DAY, '%Y-%m-%d') AS mai");
  const duong = q => `/api/khuyen-mai/${a.ma_khuyen_mai}/bao-cao${q}`;
  assert.equal((await goi('get', duong(`?tu_ngay=${hom}&den_ngay=${hom}`))).body.data.so_luong_ban, 3);
  assert.equal((await goi('get', duong(`?den_ngay=${hqua}`))).body.data.so_luong_ban, 0);
  assert.equal((await goi('get', duong(`?tu_ngay=${mai}`))).body.data.so_luong_ban, 0);
  assert.equal((await goi('get', duong(`?tu_ngay=${hqua}&den_ngay=${mai}`))).body.data.so_luong_ban, 3);
  const loc = (await goi('get', duong(`?tu_ngay=${hom}`))).body.data;
  assert.equal(loc.tu_ngay, hom);
});

test('KM-07: lỗi — 404, đầu vào sai 400, nhân viên 403, chưa đăng nhập 401', async () => {
  const km = await taoKm('so_tien', 1000, []);
  assert.equal((await goi('get', '/api/khuyen-mai/999999999/bao-cao')).status, 404);
  for (const q of ['?tu_ngay=2026-13-40', '?tu_ngay=abc', '?tu_ngay=2026-10-10&den_ngay=2026-10-01', '?den_ngay=10/10/2026']) {
    assert.equal((await goi('get', `/api/khuyen-mai/${km.ma_khuyen_mai}/bao-cao${q}`)).status, 400, q);
  }
  assert.equal((await goi('get', `/api/khuyen-mai/${km.ma_khuyen_mai}/bao-cao`, 'nhanvien')).status, 403);
  assert.equal((await goi('get', `/api/khuyen-mai/${km.ma_khuyen_mai}/bao-cao`, null)).status, 401);
});

// ---------- Đồng thời ----------
test('đồng thời: xóa khuyến mãi lúc đang gọi món — hoặc order có mã và xóa 409, hoặc xóa thành công và order không có mã; không bao giờ 500/mồ côi', async () => {
  for (let i = 0; i < 25; i++) {
    const sp = await taoSp(50000);
    const km = await taoKm('so_tien', 5000, [sp.ma]);
    const [xoa, order] = await Promise.all([
      goi('delete', `/api/khuyen-mai/${km.ma_khuyen_mai}`),
      goi('post', '/api/hoa-don', 'nhanvien').send({ items: [{ ma_san_pham: sp.ma, so_luong: 2 }] }),
    ]);
    assert.equal(order.status, 201, `vòng ${i}: ${JSON.stringify(order.body)}`);
    hoaDonTao.push(order.body.data.ma_hoa_don);
    const dong = order.body.data.chi_tiet[0];
    if (xoa.status === 200) {
      assert.equal(dong.khuyen_mai.length, 0, `vòng ${i}: khuyến mãi đã xóa thì order không được mang mã`);
      assert.equal(dong.giam_gia, 0);
    } else {
      assert.equal(xoa.status, 409, `vòng ${i}: ${JSON.stringify(xoa.body)}`);
      assert.equal(dong.khuyen_mai.length, 1);
      assert.equal(dong.giam_gia, 10000);
    }
  }
  const [[{ n }]] = await pool.query(`SELECT COUNT(*) AS n FROM ChiTietHoaDonKhuyenMai x LEFT JOIN KhuyenMai k ON k.ma_khuyen_mai = x.ma_khuyen_mai WHERE k.ma_khuyen_mai IS NULL`);
  assert.equal(n, 0);
});

test('đồng thời: sửa khuyến mãi lúc đang gọi món — mỗi dòng nhận trọn giá trị CŨ hoặc MỚI, giam_gia khớp snapshot', async () => {
  const sp = await taoSp(100000);
  const km = await taoKm('so_tien', 10000, [sp.ma]);
  const kq = await Promise.all([
    goi('patch', `/api/khuyen-mai/${km.ma_khuyen_mai}`).send({ gia_tri_giam: 20000 }),
    ...[1, 2, 3, 4, 5, 6].map(() => goi('post', '/api/hoa-don', 'nhanvien').send({ items: [{ ma_san_pham: sp.ma, so_luong: 3 }] })),
  ]);
  assert.equal(kq[0].status, 200, JSON.stringify(kq[0].body));
  for (const r of kq.slice(1)) {
    assert.equal(r.status, 201, JSON.stringify(r.body));
    hoaDonTao.push(r.body.data.ma_hoa_don);
    const d = r.body.data.chi_tiet[0];
    assert.ok([10000, 20000].includes(d.khuyen_mai[0].muc_giam_moi_ly));
    assert.equal(d.giam_gia, 3 * d.khuyen_mai[0].muc_giam_moi_ly);
  }
});
