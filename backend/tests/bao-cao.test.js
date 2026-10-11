// Test 9c – KH-05 top khách thân thiết + BC-01..BC-06 báo cáo.
// Cô lập: mọi dữ liệu đặt vào cửa sổ ngày RIÊNG ở năm 2031 (các test khác chỉ tạo hóa đơn "bây giờ"), mọi truy vấn có xác nhận đều lọc trong cửa sổ đó.
// Hóa đơn được chèn trực tiếp bằng SQL (đã có snapshot) để kiểm soát thời gian thanh toán; dọn bằng tiện ích tháo/dựng trigger.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'khoa-chi-dung-cho-test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const pool = require('../src/config/db');
const { taoApp } = require('../src/app');
const { xoaSnapshot } = require('./_tien-ich-snapshot');

const app = taoApp();
const token = {};
const dot = `${Date.now()}`.slice(-8);
const P = 'TEST_BCAO_';
const T2 = '2031-03-03'; // thứ Hai
const ngay = n => { const d = new Date(`${T2}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const goi = (duong, nguoi = 'admin') => { const r = request(app).get(duong); return nguoi ? r.set('Authorization', `Bearer ${token[nguoi]}`) : r; };
const khung = `tu_ngay=${ngay(0)}&den_ngay=${ngay(35)}`;
const D = {}; // dữ liệu: danh mục, sản phẩm, khách, nhân viên
let soTT = 0;

async function donDep() {
  const [hd] = await pool.query(`SELECT DISTINCT h.ma_hoa_don FROM HoaDon h JOIN NhanVien n ON n.ma_nhan_vien = h.ma_nhan_vien WHERE n.ho_ten LIKE '${P}%'`);
  const ids = hd.map(r => r.ma_hoa_don);
  await xoaSnapshot(pool, ids);
  if (ids.length) {
    await pool.query('DELETE FROM ChiTietHoaDon WHERE ma_hoa_don IN (?)', [ids]);
    await pool.query('DELETE FROM HoaDon WHERE ma_hoa_don IN (?)', [ids]);
  }
  await pool.query(`DELETE p FROM PhieuNhap p JOIN NhaCungCap n ON n.ma_ncc = p.ma_ncc WHERE n.ten_ncc LIKE '${P}%'`);
  await pool.query(`DELETE FROM NhaCungCap WHERE ten_ncc LIKE '${P}%'`);
  await pool.query(`DELETE FROM SanPham WHERE ten_san_pham LIKE '${P}%'`);
  await pool.query(`DELETE FROM DanhMuc WHERE ten_danh_muc LIKE '${P}%'`);
  await pool.query(`DELETE FROM KhachHang WHERE ten_khach_hang LIKE '${P}%'`);
  await pool.query(`DELETE FROM NhanVien WHERE ho_ten LIKE '${P}%'`);
}
const ins = async (sql, tham) => (await pool.query(sql, tham))[0].insertId;
// Chèn một hóa đơn đã thanh toán + snapshot. dong: [[maSp, soLuong, donGia, giamGia]]
async function hoaDon({ luc, pt = 'tien_mat', nv, kh = null, dong, trangThai = 'da_thanh_toan' }) {
  const hang = dong.reduce((t, d) => t + d[1] * d[2], 0); const giam = dong.reduce((t, d) => t + d[3], 0);
  const ma = await ins('INSERT INTO HoaDon (ma_khach_hang, ma_nhan_vien, so_thu_tu, thoi_gian_tao, trang_thai, phuong_thuc_thanh_toan, tong_tien) VALUES (?,?,?,?,?,?,?)',
    [kh, nv, ++soTT, luc, trangThai, trangThai === 'da_thanh_toan' ? pt : null, hang - giam]);
  for (const d of dong) await pool.query('INSERT INTO ChiTietHoaDon (ma_hoa_don, ma_san_pham, so_luong, don_gia, giam_gia) VALUES (?,?,?,?,?)', [ma, d[0], d[1], d[2], d[3]]);
  if (trangThai === 'da_thanh_toan') {
    await pool.query(`INSERT INTO HoaDonDaThanhToan (ma_hoa_don, ma_khach_hang, ma_nhan_vien, so_thu_tu, thoi_gian_tao, thoi_gian_thanh_toan, phuong_thuc_thanh_toan, tong_tien_hang, tong_giam_gia, tong_tien, diem_cong)
      VALUES (?,?,?,?,?,?,?,?,?,?,0)`, [ma, kh, nv, soTT, luc, luc, pt, hang, giam, hang - giam]);
  }
  return ma;
}
const nhap = (luc, tong) => ins('INSERT INTO PhieuNhap (ma_ncc, ma_nhan_vien, ngay_nhap, tong_tien_nhap) VALUES (?,?,?,?)', [D.ncc, D.nv1, luc, tong]);

before(async () => {
  await donDep();
  for (const [t, mk] of [['admin', 'Admin@123'], ['quanly', 'Quanly@123'], ['nhanvien', 'Nhanvien@123']]) {
    token[t] = (await request(app).post('/api/auth/dang-nhap').send({ ten_dang_nhap: t, mat_khau: mk })).body.data.token;
  }
  D.dm1 = await ins('INSERT INTO DanhMuc (ten_danh_muc) VALUES (?)', [`${P}${dot}_ca_phe`]);
  D.dm2 = await ins('INSERT INTO DanhMuc (ten_danh_muc) VALUES (?)', [`${P}${dot}_tra`]);
  D.a = await ins('INSERT INTO SanPham (ma_danh_muc, ten_san_pham, gia_ban) VALUES (?,?,30000)', [D.dm1, `${P}${dot}_A`]);
  D.b = await ins('INSERT INTO SanPham (ma_danh_muc, ten_san_pham, gia_ban) VALUES (?,?,40000)', [D.dm1, `${P}${dot}_B`]);
  D.c = await ins('INSERT INTO SanPham (ma_danh_muc, ten_san_pham, gia_ban) VALUES (?,?,25000)', [D.dm2, `${P}${dot}_C`]);
  D.nv1 = await ins("INSERT INTO NhanVien (ho_ten, chuc_vu) VALUES (?, 'Thu ngân')", [`${P}${dot}_nv1`]);
  D.nv2 = await ins("INSERT INTO NhanVien (ho_ten, chuc_vu) VALUES (?, 'Thu ngân')", [`${P}${dot}_nv2`]);
  for (const i of [1, 2, 3]) D[`k${i}`] = await ins('INSERT INTO KhachHang (ten_khach_hang, so_dien_thoai) VALUES (?,?)', [`${P}${dot}_k${i}`, `88${dot}${i}`]);
  D.ncc = await ins('INSERT INTO NhaCungCap (ten_ncc) VALUES (?)', [`${P}${dot}_ncc`]);

  const { a, b, c, nv1, nv2, k1, k2, k3 } = D;
  await hoaDon({ luc: `${ngay(0)} 09:00:00`, pt: 'tien_mat', nv: nv1, kh: k1, dong: [[a, 2, 30000, 6000], [b, 1, 40000, 0]] });      // 94000
  await hoaDon({ luc: `${ngay(0)} 23:59:59`, pt: 'chuyen_khoan', nv: nv2, kh: k3, dong: [[c, 3, 25000, 0]] });                       // 75000
  await hoaDon({ luc: `${ngay(1)} 10:00:00`, pt: 'vi', nv: nv1, kh: k1, dong: [[a, 1, 30000, 3000]] });                              // 27000
  await hoaDon({ luc: `${ngay(2)} 08:00:00`, pt: 'tien_mat', nv: nv1, kh: k2, dong: [[c, 4, 25000, 0]] });                           // 100000
  await hoaDon({ luc: `${ngay(6)} 12:00:00`, pt: 'tien_mat', nv: nv1, kh: null, dong: [[b, 2, 40000, 0]] });                         // 80000 (khách vãng lai)
  await hoaDon({ luc: `${ngay(7)} 00:00:00`, pt: 'tien_mat', nv: nv2, kh: k3, dong: [[c, 1, 25000, 0]] });                           // 25000
  await hoaDon({ luc: `${ngay(35)} 15:30:00`, pt: 'chuyen_khoan', nv: nv2, kh: k1, dong: [[a, 1, 30000, 0]] });                      // 30000
  // KHÔNG được tính: hóa đơn chưa thanh toán / đã hủy (không có snapshot)
  await hoaDon({ luc: `${ngay(0)} 11:00:00`, nv: nv1, kh: k1, dong: [[a, 9, 30000, 0]], trangThai: 'da_phuc_vu' });
  await hoaDon({ luc: `${ngay(1)} 11:00:00`, nv: nv2, kh: k2, dong: [[b, 9, 40000, 0]], trangThai: 'huy' });
  await nhap(`${ngay(0)} 08:00:00`, 50000.50);
  await nhap(`${ngay(0)} 20:00:00`, 20000);
  await nhap(`${ngay(3)} 10:00:00`, 10000.25);
  await nhap(`${ngay(20)} 10:00:00`, 5000);
});
after(async () => { await donDep(); await pool.end(); });

const du = r => { assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.ok, true); return r.body.data; };

// ---------- quyền & validate chung ----------
const DUONG = ['/api/bao-cao/doanh-thu', '/api/bao-cao/san-pham-ban-chay', '/api/bao-cao/doanh-thu-theo-danh-muc', '/api/bao-cao/phuong-thuc-thanh-toan',
  '/api/bao-cao/chi-phi-vs-doanh-thu', '/api/bao-cao/doanh-thu-theo-nhan-vien', '/api/khach-hang/top'];
test('quyền: A/Q xem được; nhân viên 403; chưa đăng nhập 401 (cả 7 endpoint)', async () => {
  for (const d of DUONG) {
    assert.equal((await goi(`${d}?${khung}`, 'admin')).status, 200, d);
    assert.equal((await goi(`${d}?${khung}`, 'quanly')).status, 200, d);
    assert.equal((await goi(`${d}?${khung}`, 'nhanvien')).status, 403, d);
    assert.equal((await goi(`${d}?${khung}`, null)).status, 401, d);
  }
});
test('validate: ngày sai định dạng/không tồn tại, tu_ngay sau den_ngay → 400 (cả 7 endpoint)', async () => {
  for (const d of DUONG) {
    for (const q of ['tu_ngay=2031-3-3', 'den_ngay=abc', 'tu_ngay=2031-02-30', `tu_ngay=${ngay(5)}&den_ngay=${ngay(4)}`, 'tu_ngay=']) {
      const r = await goi(`${d}?${q}`);
      assert.equal(r.status, 400, `${d}?${q} ${JSON.stringify(r.body)}`);
      assert.equal(r.body.loi, 'DU_LIEU_SAI');
    }
    assert.equal((await goi(`${d}?tu_ngay=${ngay(5)}&den_ngay=${ngay(5)}`)).status, 200, 'cùng một ngày là hợp lệ');
  }
});
test('validate: nhom và top', async () => {
  for (const q of ['nhom=nam', 'nhom=', 'nhom=NGAY']) {
    assert.equal((await goi(`/api/bao-cao/doanh-thu?${q}`)).status, 400, q);
    assert.equal((await goi(`/api/bao-cao/chi-phi-vs-doanh-thu?${q}`)).status, 400, q);
  }
  for (const q of ['top=0', 'top=101', 'top=abc', 'top=1.5', 'top=-1']) {
    assert.equal((await goi(`/api/bao-cao/san-pham-ban-chay?${q}`)).status, 400, q);
    assert.equal((await goi(`/api/khach-hang/top?${q}`)).status, 400, q);
  }
  assert.equal((await goi(`/api/bao-cao/san-pham-ban-chay?top=100&${khung}`)).status, 200);
});
test('không lọc ngày vẫn chạy được; cửa sổ không có dữ liệu → mảng rỗng', async () => {
  for (const d of DUONG) {
    assert.ok(Array.isArray(du(await goi(d))), d);
    assert.deepEqual(du(await goi(`${d}?tu_ngay=2032-01-01&den_ngay=2032-01-31`)), [], d);
  }
});

// ---------- BC-01 ----------
test('BC-01 theo ngày: chỉ hóa đơn đã thanh toán, tổng đúng, sắp tăng dần', async () => {
  const r = du(await goi(`/api/bao-cao/doanh-thu?${khung}`));
  assert.deepEqual(r, [
    { ky: ngay(0), so_don: 2, doanh_thu: 169000 }, { ky: ngay(1), so_don: 1, doanh_thu: 27000 }, { ky: ngay(2), so_don: 1, doanh_thu: 100000 },
    { ky: ngay(6), so_don: 1, doanh_thu: 80000 }, { ky: ngay(7), so_don: 1, doanh_thu: 25000 }, { ky: ngay(35), so_don: 1, doanh_thu: 30000 },
  ]);
  assert.deepEqual(du(await goi(`/api/bao-cao/doanh-thu?nhom=ngay&${khung}`)), r, 'mặc định là ngày');
});
test('BC-01 theo tuần (ky = thứ Hai) và theo tháng (YYYY-MM)', async () => {
  assert.deepEqual(du(await goi(`/api/bao-cao/doanh-thu?nhom=tuan&${khung}`)), [
    { ky: ngay(0), so_don: 5, doanh_thu: 376000 }, { ky: ngay(7), so_don: 1, doanh_thu: 25000 }, { ky: ngay(35), so_don: 1, doanh_thu: 30000 },
  ]);
  assert.deepEqual(du(await goi(`/api/bao-cao/doanh-thu?nhom=thang&${khung}`)), [
    { ky: '2031-03', so_don: 6, doanh_thu: 401000 }, { ky: '2031-04', so_don: 1, doanh_thu: 30000 },
  ]);
});
test('BC-01 biên ngày: den_ngay gồm cả 23:59:59, tu_ngay gồm 00:00:00', async () => {
  assert.deepEqual(du(await goi(`/api/bao-cao/doanh-thu?tu_ngay=${ngay(0)}&den_ngay=${ngay(0)}`)), [{ ky: ngay(0), so_don: 2, doanh_thu: 169000 }]);
  assert.deepEqual(du(await goi(`/api/bao-cao/doanh-thu?tu_ngay=${ngay(7)}&den_ngay=${ngay(7)}`)), [{ ky: ngay(7), so_don: 1, doanh_thu: 25000 }]);
  assert.deepEqual(du(await goi(`/api/bao-cao/doanh-thu?tu_ngay=${ngay(3)}&den_ngay=${ngay(5)}`)), []);
  assert.equal(du(await goi(`/api/bao-cao/doanh-thu?tu_ngay=${ngay(2)}&den_ngay=${ngay(6)}`)).length, 2);
  // chỉ có den_ngay / chỉ có tu_ngay
  assert.deepEqual(du(await goi(`/api/bao-cao/doanh-thu?tu_ngay=${ngay(35)}`)), [{ ky: ngay(35), so_don: 1, doanh_thu: 30000 }]);
  assert.deepEqual(du(await goi(`/api/bao-cao/doanh-thu?tu_ngay=${ngay(-30)}&den_ngay=${ngay(-1)}`)), []);
});

// ---------- BC-02 ----------
test('BC-02 sản phẩm bán chạy: SUM số lượng, doanh thu sau giảm, đồng hạng xếp theo doanh thu; top giới hạn', async () => {
  const r = du(await goi(`/api/bao-cao/san-pham-ban-chay?${khung}`));
  assert.deepEqual(r.map(x => [x.ten_san_pham, x.so_luong, x.doanh_thu]), [[`${P}${dot}_C`, 8, 200000], [`${P}${dot}_A`, 4, 111000], [`${P}${dot}_B`, 3, 120000]]);
  assert.equal(r[0].ma_san_pham, D.c);
  const top2 = du(await goi(`/api/bao-cao/san-pham-ban-chay?top=2&${khung}`));
  assert.deepEqual(top2.map(x => x.ma_san_pham), [D.c, D.a]);
  assert.equal(du(await goi(`/api/bao-cao/san-pham-ban-chay?top=1&${khung}`)).length, 1);
});
test('BC-02 lọc theo ngày: chỉ tính ly bán trong khoảng', async () => {
  const r = du(await goi(`/api/bao-cao/san-pham-ban-chay?tu_ngay=${ngay(0)}&den_ngay=${ngay(1)}`));
  assert.deepEqual(r.map(x => [x.ma_san_pham, x.so_luong, x.doanh_thu]), [[D.a, 3, 81000], [D.c, 3, 75000], [D.b, 1, 40000]]);
});

test('BC-02 đồng hạng số lượng: doanh thu cao hơn xếp trước dù id sản phẩm lớn hơn', async () => {
  await hoaDon({ luc: `${ngay(60)} 09:00:00`, nv: D.nv1, dong: [[D.a, 2, 30000, 0], [D.b, 2, 40000, 0]] });
  const r = du(await goi(`/api/bao-cao/san-pham-ban-chay?tu_ngay=${ngay(60)}&den_ngay=${ngay(60)}`));
  assert.deepEqual(r.map(x => [x.ma_san_pham, x.so_luong, x.doanh_thu]), [[D.b, 2, 80000], [D.a, 2, 60000]]);
});

// ---------- BC-03 ----------
test('BC-03 theo danh mục: doanh thu + tỷ lệ %, tổng khớp BC-01', async () => {
  const r = du(await goi(`/api/bao-cao/doanh-thu-theo-danh-muc?${khung}`));
  assert.deepEqual(r.map(x => [x.ma_danh_muc, x.doanh_thu, x.ty_le]), [[D.dm1, 231000, 53.6], [D.dm2, 200000, 46.4]]);
  assert.equal(r.length, 2);
  const tong = r.reduce((t, x) => t + x.doanh_thu, 0);
  const bc01 = du(await goi(`/api/bao-cao/doanh-thu?${khung}`)).reduce((t, x) => t + x.doanh_thu, 0);
  assert.equal(tong, bc01); assert.equal(tong, 431000);
  assert.equal(Math.round(r.reduce((t, x) => t + x.ty_le, 0) * 100) / 100, 100);
  assert.equal(r[0].ten_danh_muc, `${P}${dot}_ca_phe`);
});
test('BC-03 một danh mục duy nhất → 100%', async () => {
  const r = du(await goi(`/api/bao-cao/doanh-thu-theo-danh-muc?tu_ngay=${ngay(2)}&den_ngay=${ngay(2)}`));
  assert.deepEqual(r.map(x => [x.ma_danh_muc, x.doanh_thu, x.ty_le]), [[D.dm2, 100000, 100]]);
});

// ---------- BC-04 ----------
test('BC-04 theo phương thức thanh toán', async () => {
  assert.deepEqual(du(await goi(`/api/bao-cao/phuong-thuc-thanh-toan?${khung}`)), [
    { phuong_thuc: 'tien_mat', so_don: 4, tong_tien: 299000 }, { phuong_thuc: 'chuyen_khoan', so_don: 2, tong_tien: 105000 }, { phuong_thuc: 'vi', so_don: 1, tong_tien: 27000 },
  ]);
  assert.deepEqual(du(await goi(`/api/bao-cao/phuong-thuc-thanh-toan?tu_ngay=${ngay(1)}&den_ngay=${ngay(1)}`)), [{ phuong_thuc: 'vi', so_don: 1, tong_tien: 27000 }]);
});

// ---------- BC-05 ----------
test('BC-05 theo ngày: kỳ chỉ có chi phí hoặc chỉ có doanh thu vẫn xuất hiện; chênh lệch = doanh thu - chi phí', async () => {
  const r = du(await goi(`/api/bao-cao/chi-phi-vs-doanh-thu?${khung}`));
  assert.deepEqual(r, [
    { ky: ngay(0), doanh_thu: 169000, chi_phi_nhap: 70000.5, chenh_lech: 98999.5 },
    { ky: ngay(1), doanh_thu: 27000, chi_phi_nhap: 0, chenh_lech: 27000 },
    { ky: ngay(2), doanh_thu: 100000, chi_phi_nhap: 0, chenh_lech: 100000 },
    { ky: ngay(3), doanh_thu: 0, chi_phi_nhap: 10000.25, chenh_lech: -10000.25 },
    { ky: ngay(6), doanh_thu: 80000, chi_phi_nhap: 0, chenh_lech: 80000 },
    { ky: ngay(7), doanh_thu: 25000, chi_phi_nhap: 0, chenh_lech: 25000 },
    { ky: ngay(20), doanh_thu: 0, chi_phi_nhap: 5000, chenh_lech: -5000 },
    { ky: ngay(35), doanh_thu: 30000, chi_phi_nhap: 0, chenh_lech: 30000 },
  ]);
});
test('BC-05 theo tuần và tháng', async () => {
  assert.deepEqual(du(await goi(`/api/bao-cao/chi-phi-vs-doanh-thu?nhom=tuan&${khung}`)), [
    { ky: ngay(0), doanh_thu: 376000, chi_phi_nhap: 80000.75, chenh_lech: 295999.25 },
    { ky: ngay(7), doanh_thu: 25000, chi_phi_nhap: 0, chenh_lech: 25000 },
    { ky: ngay(14), doanh_thu: 0, chi_phi_nhap: 5000, chenh_lech: -5000 },
    { ky: ngay(35), doanh_thu: 30000, chi_phi_nhap: 0, chenh_lech: 30000 },
  ]);
  assert.deepEqual(du(await goi(`/api/bao-cao/chi-phi-vs-doanh-thu?nhom=thang&${khung}`)), [
    { ky: '2031-03', doanh_thu: 401000, chi_phi_nhap: 85000.75, chenh_lech: 315999.25 },
    { ky: '2031-04', doanh_thu: 30000, chi_phi_nhap: 0, chenh_lech: 30000 },
  ]);
});
test('BC-05 biên ngày của phiếu nhập (20:00 cùng ngày được tính khi den_ngay = ngày đó)', async () => {
  assert.deepEqual(du(await goi(`/api/bao-cao/chi-phi-vs-doanh-thu?tu_ngay=${ngay(0)}&den_ngay=${ngay(0)}`)), [{ ky: ngay(0), doanh_thu: 169000, chi_phi_nhap: 70000.5, chenh_lech: 98999.5 }]);
  assert.deepEqual(du(await goi(`/api/bao-cao/chi-phi-vs-doanh-thu?tu_ngay=${ngay(3)}&den_ngay=${ngay(3)}`)), [{ ky: ngay(3), doanh_thu: 0, chi_phi_nhap: 10000.25, chenh_lech: -10000.25 }]);
});

// ---------- BC-06 ----------
test('BC-06 theo nhân viên: gồm cả khách vãng lai, sắp theo doanh thu giảm dần', async () => {
  const r = du(await goi(`/api/bao-cao/doanh-thu-theo-nhan-vien?${khung}`));
  assert.deepEqual(r.map(x => [x.ma_nhan_vien, x.ho_ten, x.so_don, x.doanh_thu]), [[D.nv1, `${P}${dot}_nv1`, 4, 301000], [D.nv2, `${P}${dot}_nv2`, 3, 130000]]);
  assert.deepEqual(du(await goi(`/api/bao-cao/doanh-thu-theo-nhan-vien?tu_ngay=${ngay(7)}&den_ngay=${ngay(30)}`)).map(x => [x.ma_nhan_vien, x.so_don, x.doanh_thu]), [[D.nv2, 1, 25000]]);
});

// ---------- KH-05 ----------
test('KH-05 top khách: SUM tong_tien, bỏ khách vãng lai, đồng hạng theo số đơn', async () => {
  const r = du(await goi(`/api/khach-hang/top?${khung}`, 'quanly'));
  assert.deepEqual(r.map(x => [x.ma_khach_hang, x.ten, x.so_don, x.tong_chi_tieu]), [
    [D.k1, `${P}${dot}_k1`, 3, 151000], [D.k3, `${P}${dot}_k3`, 2, 100000], [D.k2, `${P}${dot}_k2`, 1, 100000], // đồng hạng 100000: nhiều đơn hơn xếp trước dù id lớn hơn
  ]);
  assert.equal(r[0].so_dien_thoai, `88${dot}1`);
});
test('KH-05 top giới hạn số dòng; lọc theo ngày; mặc định 10', async () => {
  assert.deepEqual(du(await goi(`/api/khach-hang/top?top=1&${khung}`)).map(x => x.ma_khach_hang), [D.k1]);
  assert.deepEqual(du(await goi(`/api/khach-hang/top?top=2&${khung}`)).map(x => x.ma_khach_hang), [D.k1, D.k3]);
  assert.deepEqual(du(await goi(`/api/khach-hang/top?tu_ngay=${ngay(0)}&den_ngay=${ngay(1)}`)).map(x => [x.ma_khach_hang, x.tong_chi_tieu]), [[D.k1, 121000], [D.k3, 75000]]);
  // đặt 12 khách vào một ngày riêng để kiểm tra mặc định 10
  const ks = [];
  for (let i = 0; i < 12; i++) {
    const k = await ins('INSERT INTO KhachHang (ten_khach_hang, so_dien_thoai) VALUES (?,?)', [`${P}${dot}_m${i}`, `77${dot}${String(i).padStart(2, '0')}`]);
    ks.push(k);
    await hoaDon({ luc: `${ngay(50)} 10:00:00`, nv: D.nv1, kh: k, dong: [[D.c, 1 + i, 25000, 0]] });
  }
  const r = du(await goi(`/api/khach-hang/top?tu_ngay=${ngay(50)}&den_ngay=${ngay(50)}`));
  assert.equal(r.length, 10);
  assert.deepEqual(r.map(x => x.ma_khach_hang), ks.slice().reverse().slice(0, 10));
});
