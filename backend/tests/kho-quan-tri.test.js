// Test 8a – module kho (quản trị): KHO-01 nguyên liệu, KHO-02 nhà cung cấp, KHO-06 tồn kho/cảnh báo.
// Dữ liệu riêng: nguyên liệu TEST_NL_*, nhà cung cấp TEST_NCC_*, danh mục TEST_NL_DM, sản phẩm TEST_NL_SP*. (kho.test.js dùng tiền tố TEST_KHO_ và
// tự dọn theo tiền tố đó, nên file này KHÔNG được dùng TEST_KHO_.) Mọi khẳng định trên danh sách chỉ nhìn vào dữ liệu của chính file này.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'khoa-chi-dung-cho-test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const pool = require('../src/config/db');
const { taoApp } = require('../src/app');

const app = taoApp();
const token = {};
const hoaDonTao = [];
const dot = `${Date.now()}`.slice(-8); // phân biệt các lần chạy
let dem = 0; let maNv;
const ten = (loai = 'NL') => `TEST_${loai}_${dot}_${dem++}`;

const goi = (pt, duong, nguoi = 'quanly') => {
  const r = request(app)[pt](duong);
  return nguoi ? r.set('Authorization', `Bearer ${token[nguoi]}`) : r;
};
const taoNl = async (ghiDe = {}, nguoi = 'quanly') => {
  const res = await goi('post', '/api/kho/nguyen-lieu', nguoi).send({ ten_nguyen_lieu: ten(), don_vi_tinh: 'g', ...ghiDe });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data;
};
const taoNcc = async (ghiDe = {}) => {
  const res = await goi('post', '/api/kho/nha-cung-cap').send({ ten_ncc: ten('NCC'), ...ghiDe });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data;
};
// Tạo nguyên liệu bằng SQL với tồn cho trước (chưa có API nhập hàng ở bước 8a)
const nlSql = async (tenNl, ton, muc, dv = 'g') =>
  (await pool.query('INSERT INTO NguyenLieu (ten_nguyen_lieu, don_vi_tinh, so_luong_ton, muc_ton_toi_thieu) VALUES (?, ?, ?, ?)', [tenNl, dv, ton, muc]))[0].insertId;
const loiCode = res => res.body.loi;

async function donDep() {
  const [rows] = await pool.query(`SELECT DISTINCT c.ma_hoa_don FROM ChiTietHoaDon c JOIN SanPham s ON s.ma_san_pham = c.ma_san_pham WHERE s.ten_san_pham LIKE 'TEST\\_NL\\_%'`);
  const ids = [...new Set([...hoaDonTao, ...rows.map(r => r.ma_hoa_don)])];
  if (ids.length) {
    await pool.query('DELETE FROM ChiTietHoaDon WHERE ma_hoa_don IN (?)', [ids]);
    await pool.query('DELETE FROM HoaDon WHERE ma_hoa_don IN (?)', [ids]);
  }
  await pool.query("DELETE ct FROM CongThuc ct JOIN SanPham s ON s.ma_san_pham = ct.ma_san_pham WHERE s.ten_san_pham LIKE 'TEST\\_NL\\_%'");
  await pool.query("DELETE ct FROM CongThuc ct JOIN NguyenLieu n ON n.ma_nguyen_lieu = ct.ma_nguyen_lieu WHERE n.ten_nguyen_lieu LIKE 'TEST\\_NL\\_%'");
  await pool.query("DELETE c FROM ChiTietNhap c JOIN NguyenLieu n ON n.ma_nguyen_lieu = c.ma_nguyen_lieu WHERE n.ten_nguyen_lieu LIKE 'TEST\\_NL\\_%'");
  await pool.query("DELETE c FROM ChiTietNhap c JOIN PhieuNhap p ON p.ma_phieu_nhap = c.ma_phieu_nhap JOIN NhaCungCap n ON n.ma_ncc = p.ma_ncc WHERE n.ten_ncc LIKE 'TEST\\_NCC\\_%'");
  await pool.query("DELETE p FROM PhieuNhap p JOIN NhaCungCap n ON n.ma_ncc = p.ma_ncc WHERE n.ten_ncc LIKE 'TEST\\_NCC\\_%'");
  await pool.query("DELETE FROM NhaCungCap WHERE ten_ncc LIKE 'TEST\\_NCC\\_%'");
  await pool.query("DELETE FROM NguyenLieu WHERE ten_nguyen_lieu LIKE 'TEST\\_NL\\_%'");
  await pool.query("DELETE FROM SanPham WHERE ten_san_pham LIKE 'TEST\\_NL\\_%'");
  await pool.query("DELETE FROM DanhMuc WHERE ten_danh_muc LIKE 'TEST\\_NL\\_%'");
  hoaDonTao.length = 0;
}

before(async () => {
  await donDep();
  for (const [t, mk] of [['admin', 'Admin@123'], ['quanly', 'Quanly@123'], ['nhanvien', 'Nhanvien@123']]) {
    const res = await request(app).post('/api/auth/dang-nhap').send({ ten_dang_nhap: t, mat_khau: mk });
    token[t] = res.body.data.token;
  }
  maNv = (await pool.query("SELECT ma_nhan_vien FROM TaiKhoan WHERE ten_dang_nhap = 'quanly'"))[0][0].ma_nhan_vien;
});
after(async () => {
  await donDep();
  await pool.end();
});

// ---------- KHO-01 ----------
test('KHO-01: tạo nguyên liệu; tồn khởi tạo 0; admin và quản lý đều tạo được; tự cắt khoảng trắng', async () => {
  const a = await taoNl({ ten_nguyen_lieu: `  ${ten()}  `, don_vi_tinh: ' ml ', muc_ton_toi_thieu: 250.5 }, 'admin');
  assert.equal(a.so_luong_ton, 0);
  assert.equal(a.muc_ton_toi_thieu, 250.5);
  assert.equal(a.don_vi_tinh, 'ml');
  assert.ok(a.ten_nguyen_lieu.startsWith('TEST_NL_') && a.ten_nguyen_lieu.trim() === a.ten_nguyen_lieu);
  assert.ok(Number.isInteger(a.ma_nguyen_lieu));
  const q = await taoNl();
  assert.equal(q.muc_ton_toi_thieu, 0, 'không gửi mức tối thiểu thì mặc định 0');
  assert.equal((await goi('get', `/api/kho/nguyen-lieu/${q.ma_nguyen_lieu}`)).body.data.so_luong_ton, 0);
});

test('KHO-01: nhân viên 403, chưa đăng nhập 401, không tạo gì', async () => {
  const t = ten();
  assert.equal((await goi('post', '/api/kho/nguyen-lieu', 'nhanvien').send({ ten_nguyen_lieu: t, don_vi_tinh: 'g' })).status, 403);
  assert.equal((await goi('post', '/api/kho/nguyen-lieu', null).send({ ten_nguyen_lieu: t, don_vi_tinh: 'g' })).status, 401);
  assert.equal((await goi('get', '/api/kho/nguyen-lieu', 'nhanvien')).status, 403);
  assert.equal((await goi('get', '/api/kho/ton-kho', 'nhanvien')).status, 403);
  assert.equal((await pool.query('SELECT COUNT(*) AS n FROM NguyenLieu WHERE ten_nguyen_lieu = ?', [t]))[0][0].n, 0);
});

test('KHO-01: đầu vào sai -> 400 (kể cả gửi so_luong_ton hay trường lạ); trùng tên 409 không phân biệt hoa thường', async () => {
  const hop = { ten_nguyen_lieu: ten(), don_vi_tinh: 'g' };
  const sai = [
    { ...hop, so_luong_ton: 100 }, { ...hop, truong_la: 1 }, { don_vi_tinh: 'g' }, { ten_nguyen_lieu: hop.ten_nguyen_lieu },
    { ...hop, ten_nguyen_lieu: '   ' }, { ...hop, ten_nguyen_lieu: 'x'.repeat(101) }, { ...hop, don_vi_tinh: 'y'.repeat(21) },
    { ...hop, muc_ton_toi_thieu: -1 }, { ...hop, muc_ton_toi_thieu: 'abc' }, { ...hop, muc_ton_toi_thieu: 1.2345 },
    { ...hop, muc_ton_toi_thieu: 1e12 }, { ...hop, don_vi_tinh: 5 },
  ];
  for (const b of sai) {
    const r = await goi('post', '/api/kho/nguyen-lieu').send(b);
    assert.equal(r.status, 400, JSON.stringify(b));
    assert.equal(loiCode(r), 'DU_LIEU_SAI');
  }
  const goc = await taoNl();
  for (const t of [goc.ten_nguyen_lieu, goc.ten_nguyen_lieu.toLowerCase(), `  ${goc.ten_nguyen_lieu}  `]) {
    const r = await goi('post', '/api/kho/nguyen-lieu').send({ ten_nguyen_lieu: t, don_vi_tinh: 'g' });
    assert.equal(r.status, 409, t);
    assert.equal(loiCode(r), 'TRUNG_TEN_NGUYEN_LIEU');
  }
});

test('KHO-01: sửa từng phần, giữ nguyên trường không gửi; không sửa được so_luong_ton; trùng tên 409; 404', async () => {
  const nl = await taoNl({ muc_ton_toi_thieu: 10 });
  const khac = await taoNl();
  const a = await goi('patch', `/api/kho/nguyen-lieu/${nl.ma_nguyen_lieu}`).send({ muc_ton_toi_thieu: 99.125 });
  assert.equal(a.status, 200, JSON.stringify(a.body));
  assert.deepEqual([a.body.data.ten_nguyen_lieu, a.body.data.don_vi_tinh, a.body.data.muc_ton_toi_thieu], [nl.ten_nguyen_lieu, 'g', 99.125]);
  const moiTen = ten();
  const b = await goi('patch', `/api/kho/nguyen-lieu/${nl.ma_nguyen_lieu}`, 'admin').send({ ten_nguyen_lieu: `  ${moiTen} `, don_vi_tinh: 'kg' });
  assert.equal(b.status, 200);
  assert.deepEqual([b.body.data.ten_nguyen_lieu, b.body.data.don_vi_tinh, b.body.data.muc_ton_toi_thieu], [moiTen, 'kg', 99.125]);
  // giữ nguyên tên của chính mình: không tính là trùng
  assert.equal((await goi('patch', `/api/kho/nguyen-lieu/${nl.ma_nguyen_lieu}`).send({ ten_nguyen_lieu: moiTen })).status, 200);
  // lỗi
  for (const body of [{ so_luong_ton: 5 }, { muc_ton_toi_thieu: 1, so_luong_ton: 5 }, { ten_nguyen_lieu: ten(), truong_la: 1 }, {}, { ten_nguyen_lieu: '' }, { muc_ton_toi_thieu: -3 }, { truong_la: 1 }]) {
    assert.equal((await goi('patch', `/api/kho/nguyen-lieu/${nl.ma_nguyen_lieu}`).send(body)).status, 400, JSON.stringify(body));
  }
  const trung = await goi('patch', `/api/kho/nguyen-lieu/${nl.ma_nguyen_lieu}`).send({ ten_nguyen_lieu: khac.ten_nguyen_lieu });
  assert.equal(trung.status, 409);
  assert.equal(loiCode(trung), 'TRUNG_TEN_NGUYEN_LIEU');
  assert.equal((await goi('patch', '/api/kho/nguyen-lieu/999999999').send({ muc_ton_toi_thieu: 1 })).status, 404);
  assert.equal((await goi('patch', '/api/kho/nguyen-lieu/abc').send({ muc_ton_toi_thieu: 1 })).status, 400);
  assert.equal((await goi('patch', `/api/kho/nguyen-lieu/${nl.ma_nguyen_lieu}`, 'nhanvien').send({ muc_ton_toi_thieu: 1 })).status, 403);
  assert.equal((await pool.query('SELECT so_luong_ton FROM NguyenLieu WHERE ma_nguyen_lieu = ?', [nl.ma_nguyen_lieu]))[0][0].so_luong_ton, 0);
});

test('KHO-01: đổi đơn vị tính chỉ khi chưa có tồn, chưa nằm trong công thức/phiếu nhập', async () => {
  const dm = (await pool.query('INSERT INTO DanhMuc (ten_danh_muc) VALUES (?)', [ten()]))[0].insertId;
  const sp = (await pool.query("INSERT INTO SanPham (ma_danh_muc, ten_san_pham, gia_ban) VALUES (?, ?, 10000)", [dm, ten()]))[0].insertId;
  const url = n => `/api/kho/nguyen-lieu/${n}`;
  // còn tồn -> 409
  const conTon = await nlSql(ten(), 5, 0);
  let r = await goi('patch', url(conTon)).send({ don_vi_tinh: 'kg' });
  assert.equal(r.status, 409); assert.equal(loiCode(r), 'KHONG_DOI_DON_VI');
  assert.equal((await goi('patch', url(conTon)).send({ don_vi_tinh: 'g', muc_ton_toi_thieu: 2 })).status, 200, 'giữ nguyên đơn vị thì vẫn sửa được');
  // trong công thức -> 409
  const trongCt = await nlSql(ten(), 0, 0);
  await pool.query('INSERT INTO CongThuc (ma_san_pham, ma_nguyen_lieu, dinh_luong) VALUES (?, ?, 5)', [sp, trongCt]);
  r = await goi('patch', url(trongCt)).send({ don_vi_tinh: 'kg' });
  assert.equal(r.status, 409); assert.equal(loiCode(r), 'KHONG_DOI_DON_VI');
  // trong phiếu nhập -> 409
  const ncc = await taoNcc();
  const trongPn = await nlSql(ten(), 0, 0);
  const pn = (await pool.query('INSERT INTO PhieuNhap (ma_ncc, ma_nhan_vien, tong_tien_nhap) VALUES (?, ?, 0)', [ncc.ma_ncc, maNv]))[0].insertId;
  await pool.query('INSERT INTO ChiTietNhap (ma_phieu_nhap, ma_nguyen_lieu, so_luong_nhap, don_gia_nhap) VALUES (?, ?, 1, 0)', [pn, trongPn]);
  r = await goi('patch', url(trongPn)).send({ don_vi_tinh: 'kg' });
  assert.equal(r.status, 409);
  // tự do -> đổi được
  const tuDo = await nlSql(ten(), 0, 0);
  r = await goi('patch', url(tuDo)).send({ don_vi_tinh: 'lít' });
  assert.equal(r.status, 200); assert.equal(r.body.data.don_vi_tinh, 'lít');
});

test('KHO-01: xóa; chặn khi đã có trong công thức hoặc phiếu nhập (409); 404; quyền', async () => {
  const dm = (await pool.query('INSERT INTO DanhMuc (ten_danh_muc) VALUES (?)', [ten()]))[0].insertId;
  const sp = (await pool.query("INSERT INTO SanPham (ma_danh_muc, ten_san_pham, gia_ban) VALUES (?, ?, 10000)", [dm, ten()]))[0].insertId;
  const tuDo = await taoNl();
  assert.equal((await goi('delete', `/api/kho/nguyen-lieu/${tuDo.ma_nguyen_lieu}`, 'nhanvien')).status, 403);
  const x = await goi('delete', `/api/kho/nguyen-lieu/${tuDo.ma_nguyen_lieu}`);
  assert.equal(x.status, 200, JSON.stringify(x.body));
  assert.deepEqual(x.body.data, { ma_nguyen_lieu: tuDo.ma_nguyen_lieu, da_xoa: true });
  assert.equal((await goi('get', `/api/kho/nguyen-lieu/${tuDo.ma_nguyen_lieu}`)).status, 404);
  assert.equal((await goi('delete', `/api/kho/nguyen-lieu/${tuDo.ma_nguyen_lieu}`)).status, 404);

  const ctNl = await taoNl();
  await pool.query('INSERT INTO CongThuc (ma_san_pham, ma_nguyen_lieu, dinh_luong) VALUES (?, ?, 5)', [sp, ctNl.ma_nguyen_lieu]);
  let r = await goi('delete', `/api/kho/nguyen-lieu/${ctNl.ma_nguyen_lieu}`);
  assert.equal(r.status, 409); assert.equal(loiCode(r), 'NGUYEN_LIEU_DANG_DUNG');
  assert.deepEqual(r.body.chi_tiet, { cong_thuc: true, phieu_nhap: false });

  const pnNl = await taoNl(); const ncc = await taoNcc();
  const pn = (await pool.query('INSERT INTO PhieuNhap (ma_ncc, ma_nhan_vien, tong_tien_nhap) VALUES (?, ?, 0)', [ncc.ma_ncc, maNv]))[0].insertId;
  await pool.query('INSERT INTO ChiTietNhap (ma_phieu_nhap, ma_nguyen_lieu, so_luong_nhap, don_gia_nhap) VALUES (?, ?, 1, 0)', [pn, pnNl.ma_nguyen_lieu]);
  r = await goi('delete', `/api/kho/nguyen-lieu/${pnNl.ma_nguyen_lieu}`);
  assert.equal(r.status, 409);
  assert.deepEqual(r.body.chi_tiet, { cong_thuc: false, phieu_nhap: true });
  for (const n of [ctNl, pnNl]) assert.equal((await goi('get', `/api/kho/nguyen-lieu/${n.ma_nguyen_lieu}`)).status, 200, 'vẫn còn');
});

test('KHO-01: danh sách có tìm theo tên và phân trang; chi tiết 404; tham số sai 400', async () => {
  const tienTo = `TEST_NL_${dot}_LS_`;
  for (let i = 0; i < 5; i++) await taoNl({ ten_nguyen_lieu: `${tienTo}${i}` });
  const loc = `tu_khoa=${encodeURIComponent(tienTo)}`;
  const t1 = await goi('get', `/api/kho/nguyen-lieu?${loc}&moi_trang=2&trang=1`);
  const t3 = await goi('get', `/api/kho/nguyen-lieu?${loc}&moi_trang=2&trang=3`);
  assert.equal(t1.status, 200);
  assert.equal(t1.body.tong_so_ban_ghi, 5);
  assert.deepEqual([t1.body.trang, t1.body.moi_trang, t1.body.data.length, t3.body.data.length], [1, 2, 2, 1]);
  assert.deepEqual(t1.body.data.map(x => x.ten_nguyen_lieu), [`${tienTo}0`, `${tienTo}1`]);
  // ký tự đặc biệt của LIKE được thoát: '_' và '%' chỉ khớp chính nó
  assert.equal((await goi('get', `/api/kho/nguyen-lieu?tu_khoa=${encodeURIComponent('TEST%NL')}`)).body.tong_so_ban_ghi, 0);
  assert.equal((await goi('get', '/api/kho/nguyen-lieu/999999999')).status, 404);
  assert.equal((await goi('get', '/api/kho/nguyen-lieu/0')).status, 400);
  for (const q of ['?moi_trang=0', '?moi_trang=101', '?trang=0', '?trang=x', '?tu_khoa=']) {
    assert.equal((await goi('get', `/api/kho/nguyen-lieu${q}`)).status, 400, q);
  }
});

test('KHO-01 đồng thời: tạo cùng một tên 6 lần -> đúng một 201, còn lại 409; không bao giờ 500', async () => {
  for (let v = 0; v < 8; v++) {
    const t = ten();
    const rs = await Promise.all(Array.from({ length: 6 }, () => goi('post', '/api/kho/nguyen-lieu').send({ ten_nguyen_lieu: t, don_vi_tinh: 'g' })));
    assert.deepEqual(rs.map(r => r.status).sort(), [201, 409, 409, 409, 409, 409], JSON.stringify(rs.map(r => r.body)));
  }
});

test('KHO-01 đồng thời: xóa cùng một nguyên liệu 5 lần -> đúng một 200, còn lại 404; sửa và xóa cùng lúc không 500', async () => {
  for (let v = 0; v < 8; v++) {
    const nl = await taoNl();
    const rs = await Promise.all(Array.from({ length: 5 }, () => goi('delete', `/api/kho/nguyen-lieu/${nl.ma_nguyen_lieu}`)));
    assert.deepEqual(rs.map(r => r.status).sort(), [200, 404, 404, 404, 404]);
    const nl2 = await taoNl();
    const rs2 = await Promise.all([
      goi('delete', `/api/kho/nguyen-lieu/${nl2.ma_nguyen_lieu}`),
      goi('patch', `/api/kho/nguyen-lieu/${nl2.ma_nguyen_lieu}`).send({ muc_ton_toi_thieu: 3 }),
    ]);
    for (const r of rs2) assert.ok([200, 404].includes(r.status), JSON.stringify(r.body));
    assert.equal(rs2[0].status, 200);
  }
});

// ---------- KHO-02 ----------
test('KHO-02: tạo nhà cung cấp (SĐT và địa chỉ không bắt buộc); sửa từng phần; null xóa số/địa chỉ', async () => {
  const day = await taoNcc({ so_dien_thoai: '0281234567', dia_chi: '  12 Nguyễn Huệ, Q1 ' });
  assert.deepEqual([day.so_dien_thoai, day.dia_chi], ['0281234567', '12 Nguyễn Huệ, Q1']);
  const toi = await taoNcc();
  assert.deepEqual([toi.so_dien_thoai, toi.dia_chi], [null, null]);
  const moiTen = ten('NCC');
  const s = await goi('patch', `/api/kho/nha-cung-cap/${day.ma_ncc}`, 'admin').send({ ten_ncc: moiTen });
  assert.equal(s.status, 200);
  assert.deepEqual([s.body.data.ten_ncc, s.body.data.so_dien_thoai, s.body.data.dia_chi], [moiTen, '0281234567', '12 Nguyễn Huệ, Q1']);
  const x = await goi('patch', `/api/kho/nha-cung-cap/${day.ma_ncc}`).send({ so_dien_thoai: null, dia_chi: null });
  assert.deepEqual([x.body.data.so_dien_thoai, x.body.data.dia_chi], [null, null]);
  assert.equal((await goi('get', `/api/kho/nha-cung-cap/${day.ma_ncc}`)).body.data.ten_ncc, moiTen);
});

test('KHO-02: đầu vào sai 400; 404; quyền', async () => {
  const hop = { ten_ncc: ten('NCC') };
  for (const b of [{}, { ten_ncc: '' }, { ten_ncc: 'x'.repeat(151) }, { ...hop, so_dien_thoai: '123' }, { ...hop, so_dien_thoai: '0abc456789' },
    { ...hop, so_dien_thoai: '012345678' }, { ...hop, dia_chi: '' }, { ...hop, dia_chi: 'd'.repeat(256) }, { ...hop, truong_la: 1 }]) {
    assert.equal((await goi('post', '/api/kho/nha-cung-cap').send(b)).status, 400, JSON.stringify(b));
  }
  const n = await taoNcc();
  for (const b of [{}, { ten_ncc: null }, { so_dien_thoai: 'abc' }, { ma_ncc: 5 }, { ten_ncc: ten('NCC'), ma_ncc: 5 }]) {
    assert.equal((await goi('patch', `/api/kho/nha-cung-cap/${n.ma_ncc}`).send(b)).status, 400, JSON.stringify(b));
  }
  assert.equal((await goi('patch', '/api/kho/nha-cung-cap/999999999').send({ ten_ncc: 'a' })).status, 404);
  assert.equal((await goi('get', '/api/kho/nha-cung-cap/999999999')).status, 404);
  assert.equal((await goi('delete', '/api/kho/nha-cung-cap/999999999')).status, 404);
  for (const [pt, d] of [['get', '/api/kho/nha-cung-cap'], ['post', '/api/kho/nha-cung-cap'], ['patch', `/api/kho/nha-cung-cap/${n.ma_ncc}`], ['delete', `/api/kho/nha-cung-cap/${n.ma_ncc}`]]) {
    assert.equal((await goi(pt, d, 'nhanvien').send({ ten_ncc: 'a' })).status, 403, `${pt} ${d}`);
    assert.equal((await goi(pt, d, null).send({ ten_ncc: 'a' })).status, 401, `${pt} ${d}`);
  }
});

test('KHO-02: xóa; chặn khi đã có phiếu nhập (409); danh sách tìm theo tên hoặc SĐT, phân trang', async () => {
  const tuDo = await taoNcc();
  assert.equal((await goi('delete', `/api/kho/nha-cung-cap/${tuDo.ma_ncc}`)).status, 200);
  assert.equal((await goi('get', `/api/kho/nha-cung-cap/${tuDo.ma_ncc}`)).status, 404);
  const co = await taoNcc();
  await pool.query('INSERT INTO PhieuNhap (ma_ncc, ma_nhan_vien, tong_tien_nhap) VALUES (?, ?, 0)', [co.ma_ncc, maNv]);
  const r = await goi('delete', `/api/kho/nha-cung-cap/${co.ma_ncc}`);
  assert.equal(r.status, 409); assert.equal(loiCode(r), 'NCC_DA_CO_PHIEU_NHAP');
  assert.equal((await goi('get', `/api/kho/nha-cung-cap/${co.ma_ncc}`)).status, 200);

  const tienTo = `TEST_NCC_${dot}_LS_`;
  for (let i = 0; i < 3; i++) await taoNcc({ ten_ncc: `${tienTo}${i}`, so_dien_thoai: i === 2 ? '0977112233' : null });
  const t = await goi('get', `/api/kho/nha-cung-cap?tu_khoa=${encodeURIComponent(tienTo)}&moi_trang=2&trang=2`);
  assert.deepEqual([t.body.tong_so_ban_ghi, t.body.data.length], [3, 1]);
  const theoSdt = await goi('get', '/api/kho/nha-cung-cap?tu_khoa=0977112233');
  assert.ok(theoSdt.body.data.some(n => n.ten_ncc === `${tienTo}2`));
  for (const q of ['?moi_trang=0', '?trang=0', '?tu_khoa=']) assert.equal((await goi('get', `/api/kho/nha-cung-cap${q}`)).status, 400, q);
});

test('KHO-02 đồng thời: xóa nhà cung cấp lúc đang có phiếu nhập được lập -> hoặc 409 hoặc xóa trước, không 500, không phiếu mồ côi', async () => {
  for (let v = 0; v < 10; v++) {
    const n = await taoNcc();
    const [xoa, lap] = await Promise.all([
      goi('delete', `/api/kho/nha-cung-cap/${n.ma_ncc}`),
      pool.query('INSERT INTO PhieuNhap (ma_ncc, ma_nhan_vien, tong_tien_nhap) VALUES (?, ?, 0)', [n.ma_ncc, maNv]).then(() => 'lap_duoc', e => e.errno),
    ]);
    assert.ok([200, 409].includes(xoa.status), JSON.stringify(xoa.body));
    if (xoa.status === 200) assert.equal(lap, 1452, 'xóa xong thì lập phiếu bị khóa ngoại chặn');
    else assert.equal(lap, 'lap_duoc');
    const [orphan] = await pool.query('SELECT COUNT(*) AS n FROM PhieuNhap p LEFT JOIN NhaCungCap n ON n.ma_ncc = p.ma_ncc WHERE n.ma_ncc IS NULL');
    assert.equal(orphan[0].n, 0);
  }
});

// ---------- KHO-06 ----------
test('KHO-06: tồn kho kèm cờ sap_het (tồn <= mức tối thiểu); chi_sap_het lọc; sắp hết lên đầu; tìm theo tên', async () => {
  const tienTo = `TEST_NL_${dot}_TK_`;
  const het = await nlSql(`${tienTo}a_het`, 0, 0);          // 0 <= 0
  const bang = await nlSql(`${tienTo}b_bang`, 70, 70);       // bằng mức tối thiểu
  const thap = await nlSql(`${tienTo}c_thap`, 10.5, 70);
  const du = await nlSql(`${tienTo}d_du`, 500, 70);
  const duKhongMuc = await nlSql(`${tienTo}e_du0`, 0.001, 0);
  const loc = `tu_khoa=${encodeURIComponent(tienTo)}`;

  const tatCa = await goi('get', `/api/kho/ton-kho?${loc}`);
  assert.equal(tatCa.status, 200);
  assert.deepEqual(tatCa.body.data.map(x => x.ma_nguyen_lieu), [het, bang, thap, du, duKhongMuc]);
  assert.deepEqual(tatCa.body.data.map(x => x.sap_het), [true, true, true, false, false], 'sắp hết đứng trước, sau đó theo tên');
  const d = tatCa.body.data[2];
  assert.deepEqual(Object.keys(d).sort(), ['don_vi_tinh', 'ma_nguyen_lieu', 'muc_ton_toi_thieu', 'sap_het', 'so_luong_ton', 'ten_nguyen_lieu']);
  assert.deepEqual([d.so_luong_ton, d.muc_ton_toi_thieu, d.don_vi_tinh, typeof d.so_luong_ton], [10.5, 70, 'g', 'number']);

  const chiSap = await goi('get', `/api/kho/ton-kho?${loc}&chi_sap_het=true`);
  assert.deepEqual(chiSap.body.data.map(x => x.ma_nguyen_lieu), [het, bang, thap]);
  assert.ok(chiSap.body.data.every(x => x.sap_het === true));
  const khongLoc = await goi('get', `/api/kho/ton-kho?${loc}&chi_sap_het=false`);
  assert.equal(khongLoc.body.data.length, 5);
  assert.equal((await goi('get', `/api/kho/ton-kho?tu_khoa=${encodeURIComponent(`${tienTo}d`)}&chi_sap_het=true`)).body.data.length, 0);
  // không có tham số: trả về cả nguyên liệu mẫu của quán
  const macDinh = await goi('get', '/api/kho/ton-kho', 'admin');
  assert.equal(macDinh.status, 200);
  assert.ok(macDinh.body.data.length >= 6);
  for (const q of ['?chi_sap_het=abc', '?chi_sap_het=1', '?tu_khoa=']) assert.equal((await goi('get', `/api/kho/ton-kho${q}`)).status, 400, q);
});

test('KHO-06: bán hàng làm tồn giảm và cờ sap_het bật cùng lúc với canh_bao_kho của order (liên thông với POS)', async () => {
  const nl = await nlSql(ten(), 100, 70);
  const dm = (await pool.query('INSERT INTO DanhMuc (ten_danh_muc) VALUES (?)', [ten()]))[0].insertId;
  const sp = (await pool.query("INSERT INTO SanPham (ma_danh_muc, ten_san_pham, gia_ban) VALUES (?, ?, 20000)", [dm, ten('NL_SP')]))[0].insertId;
  await pool.query('INSERT INTO CongThuc (ma_san_pham, ma_nguyen_lieu, dinh_luong) VALUES (?, ?, 40)', [sp, nl]);
  const truoc = (await goi('get', '/api/kho/ton-kho?chi_sap_het=true')).body.data.find(x => x.ma_nguyen_lieu === nl);
  assert.equal(truoc, undefined, '100 > 70: chưa sắp hết');
  const od = await goi('post', '/api/hoa-don', 'nhanvien').send({ items: [{ ma_san_pham: sp, so_luong: 1 }] });
  assert.equal(od.status, 201, JSON.stringify(od.body));
  hoaDonTao.push(od.body.data.ma_hoa_don);
  assert.deepEqual(od.body.data.canh_bao_kho.map(c => [c.ma_nguyen_lieu, c.so_luong_ton]), [[nl, 60]]);
  const sau = (await goi('get', '/api/kho/ton-kho?chi_sap_het=true')).body.data.find(x => x.ma_nguyen_lieu === nl);
  assert.deepEqual([sau.so_luong_ton, sau.sap_het], [60, true]);
  // nguyên liệu nằm trong công thức không xóa được; đổi đơn vị cũng không
  assert.equal((await goi('delete', `/api/kho/nguyen-lieu/${nl}`)).status, 409);
});
