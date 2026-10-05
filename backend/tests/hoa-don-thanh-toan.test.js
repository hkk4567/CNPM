// Test POS-08 (thanh toán) và POS-11 (xem/in hóa đơn). Dữ liệu riêng TEST_TT_*: không đụng kho/khách mẫu.
// Sản phẩm TEST_TT_SP (10.000đ): công thức 20g NL1 + 5g NL2 mỗi ly. NL1 tồn 100g (mức tối thiểu 70g), NL2 tồn 50g.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'khoa-chi-dung-cho-test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const pool = require('../src/config/db');
const { taoApp } = require('../src/app');

const app = taoApp();
const token = {};
const taoRa = [];
let sp; let nl1; let nl2; let kh;

const goi = (pt, duong, ten = 'nhanvien') => {
  const r = request(app)[pt](duong);
  return ten ? r.set('Authorization', `Bearer ${token[ten]}`) : r;
};
const ton = async ma => Number((await pool.query('SELECT so_luong_ton FROM NguyenLieu WHERE ma_nguyen_lieu = ?', [ma]))[0][0].so_luong_ton);
const diemKhach = async () => (await pool.query('SELECT diem_tich_luy FROM KhachHang WHERE ma_khach_hang = ?', [kh]))[0][0].diem_tich_luy;
const datTon = async (a, b) => {
  await pool.query('UPDATE NguyenLieu SET so_luong_ton = ? WHERE ma_nguyen_lieu = ?', [a, nl1]);
  await pool.query('UPDATE NguyenLieu SET so_luong_ton = ? WHERE ma_nguyen_lieu = ?', [b, nl2]);
};
const datDiem = n => pool.query('UPDATE KhachHang SET diem_tich_luy = ? WHERE ma_khach_hang = ?', [n, kh]);

async function taoOrder(items, maKhach = null) {
  const res = await goi('post', '/api/hoa-don').send({ ma_khach_hang: maKhach, items });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  taoRa.push(res.body.data.ma_hoa_don);
  return res.body.data;
}
const tra = (ma, pt = 'tien_mat', ten) => goi('post', `/api/hoa-don/${ma}/thanh-toan`, ten).send({ phuong_thuc_thanh_toan: pt });

async function donDep() {
  if (taoRa.length) {
    await pool.query('DELETE FROM ChiTietHoaDon WHERE ma_hoa_don IN (?)', [taoRa]);
    await pool.query('DELETE FROM HoaDon WHERE ma_hoa_don IN (?)', [taoRa]);
  }
  await pool.query("DELETE c FROM ChiTietHoaDon c JOIN SanPham s ON s.ma_san_pham = c.ma_san_pham WHERE s.ten_san_pham LIKE 'TEST\\_TT\\_%'");
  await pool.query("DELETE h FROM HoaDon h JOIN KhachHang k ON k.ma_khach_hang = h.ma_khach_hang WHERE k.ten_khach_hang LIKE 'TEST\\_TT\\_%'");
  await pool.query("DELETE ct FROM CongThuc ct JOIN SanPham s ON s.ma_san_pham = ct.ma_san_pham WHERE s.ten_san_pham LIKE 'TEST\\_TT\\_%'");
  await pool.query("DELETE FROM SanPham WHERE ten_san_pham LIKE 'TEST\\_TT\\_%'");
  await pool.query("DELETE FROM NguyenLieu WHERE ten_nguyen_lieu LIKE 'TEST\\_TT\\_%'");
  await pool.query("DELETE FROM KhachHang WHERE ten_khach_hang LIKE 'TEST\\_TT\\_%'");
  await pool.query("DELETE FROM DanhMuc WHERE ten_danh_muc LIKE 'TEST\\_TT\\_%'");
}

before(async () => {
  await donDep();
  for (const [ten, mk] of [['admin', 'Admin@123'], ['quanly', 'Quanly@123'], ['nhanvien', 'Nhanvien@123']]) {
    token[ten] = (await request(app).post('/api/auth/dang-nhap').send({ ten_dang_nhap: ten, mat_khau: mk })).body.data.token;
  }
  const dm = (await pool.query("INSERT INTO DanhMuc (ten_danh_muc) VALUES ('TEST_TT_DM')"))[0].insertId;
  sp = (await pool.query('INSERT INTO SanPham (ma_danh_muc, ten_san_pham, gia_ban) VALUES (?, ?, 10000)', [dm, 'TEST_TT_SP']))[0].insertId;
  nl1 = (await pool.query("INSERT INTO NguyenLieu (ten_nguyen_lieu, don_vi_tinh, so_luong_ton, muc_ton_toi_thieu) VALUES ('TEST_TT_NL1', 'g', 100, 70)"))[0].insertId;
  nl2 = (await pool.query("INSERT INTO NguyenLieu (ten_nguyen_lieu, don_vi_tinh, so_luong_ton, muc_ton_toi_thieu) VALUES ('TEST_TT_NL2', 'g', 50, 0)"))[0].insertId;
  await pool.query('INSERT INTO CongThuc (ma_san_pham, ma_nguyen_lieu, dinh_luong) VALUES (?, ?, 20), (?, ?, 5)', [sp, nl1, sp, nl2]);
  kh = (await pool.query("INSERT INTO KhachHang (ten_khach_hang, so_dien_thoai) VALUES ('TEST_TT_KH', '0999000222')"))[0].insertId;
});
after(async () => { await donDep(); await pool.end(); });

// ---------- POS-08: thanh toán ----------
test('thanh toán: chốt tổng từ các dòng (kể cả sau khi sửa), cộng điểm, trừ kho, cảnh báo sắp hết', async () => {
  await datTon(100, 50); await datDiem(0);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 1 }, { ma_san_pham: 7, so_luong: 1 }], kh); // 10.000 + 45.000
  await goi('patch', `/api/hoa-don/${hd.ma_hoa_don}/dong/${hd.chi_tiet[0].ma_chi_tiet}`).send({ so_luong: 2 }); // đổi thành 2 ly: 20.000 + 45.000

  const res = await tra(hd.ma_hoa_don, 'chuyen_khoan');
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const d = res.body.data;
  assert.equal(d.hoa_don.trang_thai, 'da_thanh_toan');
  assert.equal(d.hoa_don.phuong_thuc_thanh_toan, 'chuyen_khoan');
  assert.equal(d.hoa_don.tong_tien, 65000);
  assert.equal(d.diem_cong, 6, 'floor(65.000 / 10.000)');
  assert.equal(d.diem_hien_tai, 6);
  assert.equal(await ton(nl1), 60, '100 - 2 ly x 20g');
  assert.equal(await ton(nl2), 40, '50 - 2 ly x 5g');
  assert.deepEqual(d.canh_bao_kho, [{ ma_nguyen_lieu: nl1, ten_nguyen_lieu: 'TEST_TT_NL1', don_vi_tinh: 'g', so_luong_ton: 60, muc_ton_toi_thieu: 70 }],
    'chỉ NL1 (60g <= mức 70g) bị cảnh báo; NL2 thì chưa');

  const [[dong]] = [(await pool.query('SELECT trang_thai, phuong_thuc_thanh_toan, tong_tien FROM HoaDon WHERE ma_hoa_don = ?', [hd.ma_hoa_don]))[0]];
  assert.deepEqual({ ...dong, tong_tien: Number(dong.tong_tien) }, { trang_thai: 'da_thanh_toan', phuong_thuc_thanh_toan: 'chuyen_khoan', tong_tien: 65000 });
});

test('thanh toán: mức giảm của dòng được trừ vào tổng; ba phương thức đều dùng được; điểm cộng dồn', async () => {
  await datTon(100, 50); await datDiem(2);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 2 }], kh);
  await pool.query('UPDATE ChiTietHoaDon SET giam_gia = 5000 WHERE ma_chi_tiet = ?', [hd.chi_tiet[0].ma_chi_tiet]);
  const res = await tra(hd.ma_hoa_don, 'vi');
  assert.equal(res.body.data.hoa_don.tong_tien, 15000, '2 x 10.000 - 5.000');
  assert.equal(res.body.data.diem_cong, 1);
  assert.equal(res.body.data.diem_hien_tai, 3, '2 + 1');
  assert.equal(await diemKhach(), 3);

  const a = await taoOrder([{ ma_san_pham: 7, so_luong: 1 }]);
  const b = await taoOrder([{ ma_san_pham: 7, so_luong: 1 }]);
  assert.equal((await tra(a.ma_hoa_don, 'tien_mat')).body.data.hoa_don.phuong_thuc_thanh_toan, 'tien_mat');
  assert.equal((await tra(b.ma_hoa_don, 'chuyen_khoan')).body.data.hoa_don.phuong_thuc_thanh_toan, 'chuyen_khoan');
});

test('thanh toán: khách vãng lai không có điểm; sản phẩm chưa có công thức không đụng kho; làm tròn xuống', async () => {
  await datTon(100, 50);
  const hd = await taoOrder([{ ma_san_pham: 7, so_luong: 1 }]); // 45.000, không công thức, không khách
  const res = await tra(hd.ma_hoa_don);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.diem_cong, 0);
  assert.equal(res.body.data.diem_hien_tai, null);
  assert.deepEqual(res.body.data.canh_bao_kho, []);
  assert.equal(await ton(nl1), 100);

  await datDiem(0);
  const nho = await taoOrder([{ ma_san_pham: sp, so_luong: 1 }], kh);
  await pool.query('UPDATE ChiTietHoaDon SET giam_gia = 1 WHERE ma_chi_tiet = ?', [nho.chi_tiet[0].ma_chi_tiet]);
  const r2 = await tra(nho.ma_hoa_don);
  assert.equal(r2.body.data.hoa_don.tong_tien, 9999);
  assert.equal(r2.body.data.diem_cong, 0, '9.999đ chưa đủ 1 điểm');
});

test('thanh toán: kiểm tra đầu vào; hóa đơn không tồn tại; chưa đăng nhập', async () => {
  const hd = await taoOrder([{ ma_san_pham: 7, so_luong: 1 }]);
  const url = `/api/hoa-don/${hd.ma_hoa_don}/thanh-toan`;
  for (const body of [{}, { phuong_thuc_thanh_toan: 'the' }, { phuong_thuc_thanh_toan: 1 }]) {
    const res = await goi('post', url).send(body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(res.body.loi, 'DU_LIEU_SAI');
  }
  assert.equal((await tra(99999999)).status, 404);
  assert.equal((await goi('post', '/api/hoa-don/abc/thanh-toan').send({ phuong_thuc_thanh_toan: 'vi' })).status, 400);
  assert.equal((await tra(hd.ma_hoa_don, 'vi', null)).status, 401);
  const [[{ trang_thai }]] = [(await pool.query('SELECT trang_thai FROM HoaDon WHERE ma_hoa_don = ?', [hd.ma_hoa_don]))[0]];
  assert.equal(trang_thai, 'dang_pha_che', 'đầu vào sai thì hóa đơn không đổi');
});

test('thanh toán hai lần: lần 2 bị 409, kho và điểm không bị tính lại', async () => {
  await datTon(100, 50); await datDiem(0);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 1 }], kh); // 10.000 -> 1 điểm, trừ 20g/5g
  assert.equal((await tra(hd.ma_hoa_don)).status, 200);
  const lan2 = await tra(hd.ma_hoa_don);
  assert.equal(lan2.status, 409);
  assert.equal(lan2.body.loi, 'HOA_DON_DA_DONG');
  assert.equal(await ton(nl1), 80);
  assert.equal(await ton(nl2), 45);
  assert.equal(await diemKhach(), 1);
});

test('đã hủy thì không thanh toán được; không đụng kho, không cộng điểm', async () => {
  await datTon(100, 50); await datDiem(0);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 2 }], kh);
  await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/huy`);
  const res = await tra(hd.ma_hoa_don);
  assert.equal(res.status, 409);
  assert.equal(res.body.loi, 'HOA_DON_DA_DONG');
  assert.equal(await ton(nl1), 100);
  assert.equal(await diemKhach(), 0);
});

test('thanh toán khi kho đã tụt: 409 KHONG_DU_NGUYEN_LIEU, hóa đơn vẫn mở, kho và điểm giữ nguyên; bổ sung kho thì trả được', async () => {
  await datTon(100, 50); await datDiem(0);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 4 }], kh); // cần 80g NL1, 20g NL2 (đủ lúc đặt)
  await datTon(50, 50); // kho tụt trước khi khách trả
  const res = await tra(hd.ma_hoa_don);
  assert.equal(res.status, 409);
  assert.equal(res.body.loi, 'KHONG_DU_NGUYEN_LIEU');
  assert.equal(res.body.thong_bao, 'Không đủ nguyên liệu: TEST_TT_NL1 cần 80 g, còn 50 g (thiếu 30 g)');
  assert.equal(await ton(nl1), 50);
  assert.equal(await ton(nl2), 50, 'không trừ dở dang');
  assert.equal(await diemKhach(), 0);
  const [[{ trang_thai }]] = [(await pool.query('SELECT trang_thai FROM HoaDon WHERE ma_hoa_don = ?', [hd.ma_hoa_don]))[0]];
  assert.equal(trang_thai, 'dang_pha_che');

  await datTon(100, 50);
  assert.equal((await tra(hd.ma_hoa_don)).status, 200);
});

test('thanh toán là "tất cả hoặc không gì cả": thiếu một nguyên liệu thì nguyên liệu kia cũng không bị trừ', async () => {
  await datTon(100, 50); await datDiem(0);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 2 }], kh); // cần 40g NL1, 10g NL2
  await datTon(100, 5); // chỉ NL2 thiếu
  const res = await tra(hd.ma_hoa_don);
  assert.equal(res.status, 409);
  assert.equal(res.body.chi_tiet.length, 1);
  assert.equal(res.body.chi_tiet[0].ten_nguyen_lieu, 'TEST_TT_NL2');
  assert.equal(await ton(nl1), 100, 'NL1 đủ nhưng không được trừ khi giao dịch hỏng');
  assert.equal(await ton(nl2), 5);
});

test('hai thanh toán đồng thời cùng dùng một nguyên liệu: tồn không bao giờ âm, chỉ đúng một thanh toán thành công', async () => {
  await datTon(100, 50);
  const a = await taoOrder([{ ma_san_pham: sp, so_luong: 3 }]); // 60g NL1: lúc đặt đều "đủ" (mỗi order 60 <= 100)
  const b = await taoOrder([{ ma_san_pham: sp, so_luong: 3 }]);
  const [ra, rb] = await Promise.all([tra(a.ma_hoa_don), tra(b.ma_hoa_don)]);
  const trangThai = [ra.status, rb.status].sort();
  assert.deepEqual(trangThai, [200, 409], `${ra.status} ${rb.status}`);
  const thua = ra.status === 409 ? ra : rb;
  assert.equal(thua.body.loi, 'KHONG_DU_NGUYEN_LIEU');
  assert.equal(await ton(nl1), 40, '100 - 60, không bị trừ hai lần, không âm');
  assert.equal(await ton(nl2), 35, '50 - 3 x 5');
});

test('bấm thanh toán nhiều lần cùng lúc trên một hóa đơn: chỉ một lần có hiệu lực', async () => {
  await datTon(100, 50); await datDiem(0);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 1 }], kh);
  const kq = await Promise.all([1, 2, 3, 4].map(() => tra(hd.ma_hoa_don)));
  assert.equal(kq.filter(r => r.status === 200).length, 1, kq.map(r => r.status).join(','));
  assert.equal(kq.filter(r => r.status === 409 && r.body.loi === 'HOA_DON_DA_DONG').length, 3);
  assert.equal(await ton(nl1), 80, 'trừ kho đúng một lần');
  assert.equal(await diemKhach(), 1, 'cộng điểm đúng một lần');
});

test('sửa và thanh toán cùng lúc: kết quả luôn nhất quán (tổng tiền khớp các dòng còn lại)', async () => {
  await datTon(100, 50);
  const hd = await taoOrder([{ ma_san_pham: 7, so_luong: 1 }, { ma_san_pham: 7, so_luong: 1, ghi_chu: 'dòng 2' }]);
  const [sua, pay] = await Promise.all([
    goi('delete', `/api/hoa-don/${hd.ma_hoa_don}/dong/${hd.chi_tiet[1].ma_chi_tiet}`),
    tra(hd.ma_hoa_don),
  ]);
  assert.equal(pay.status, 200);
  const [rows] = await pool.query('SELECT COALESCE(SUM(so_luong * don_gia - giam_gia), 0) AS tong FROM ChiTietHoaDon WHERE ma_hoa_don = ?', [hd.ma_hoa_don]);
  const [[hoaDon]] = [(await pool.query('SELECT tong_tien FROM HoaDon WHERE ma_hoa_don = ?', [hd.ma_hoa_don]))[0]];
  assert.equal(Number(hoaDon.tong_tien), Number(rows[0].tong), `sửa=${sua.status}: tổng đã chốt phải khớp các dòng còn lại`);
  assert.ok([200, 409].includes(sua.status));
  assert.equal(sua.status === 200 ? 45000 : 90000, Number(hoaDon.tong_tien), 'xóa kịp trước khi trả: 45.000; xóa chậm (bị chặn 409): 90.000');
});

// ---------- POS-11: xem / in hóa đơn ----------
test('xem hóa đơn: đủ thông tin để in bill; tong_tien là null cho tới khi thanh toán', async () => {
  await datTon(100, 50); await datDiem(0);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 2, ghi_chu: 'ít đá' }, { ma_san_pham: 7, so_luong: 1 }], kh);
  await pool.query('UPDATE ChiTietHoaDon SET giam_gia = 4000 WHERE ma_chi_tiet = ?', [hd.chi_tiet[0].ma_chi_tiet]);

  const truoc = await goi('get', `/api/hoa-don/${hd.ma_hoa_don}`);
  assert.equal(truoc.status, 200);
  const t = truoc.body.data;
  assert.equal(t.ten_khach_hang, 'TEST_TT_KH');
  assert.equal(t.ten_nhan_vien, 'Lê Văn Thu Ngân');
  assert.equal(t.chi_tiet.length, 2);
  assert.equal(t.chi_tiet[0].ten_san_pham, 'TEST_TT_SP');
  assert.equal(t.chi_tiet[0].ghi_chu, 'ít đá');
  assert.equal(t.chi_tiet[0].thanh_tien, 16000);
  assert.deepEqual({ hang: t.tong_tien_hang, giam: t.tong_giam_gia, tam: t.tong_tien_tam_tinh, chot: t.tong_tien }, { hang: 65000, giam: 4000, tam: 61000, chot: null });

  await tra(hd.ma_hoa_don, 'tien_mat');
  const sau = (await goi('get', `/api/hoa-don/${hd.ma_hoa_don}`)).body.data;
  assert.equal(sau.trang_thai, 'da_thanh_toan');
  assert.equal(sau.tong_tien, 61000);
  assert.equal(sau.tong_tien_tam_tinh, 61000);
  assert.equal(sau.phuong_thuc_thanh_toan, 'tien_mat');
});

test('xem hóa đơn: 404, tham số sai, chưa đăng nhập; nhân viên chỉ xem hóa đơn hôm nay', async () => {
  assert.equal((await goi('get', '/api/hoa-don/99999999')).status, 404);
  assert.equal((await goi('get', '/api/hoa-don/abc')).status, 400);
  const hd = await taoOrder([{ ma_san_pham: 7, so_luong: 1 }]);
  assert.equal((await goi('get', `/api/hoa-don/${hd.ma_hoa_don}`, null)).status, 401);

  await pool.query('UPDATE HoaDon SET thoi_gian_tao = NOW() - INTERVAL 3 DAY WHERE ma_hoa_don = ?', [hd.ma_hoa_don]);
  const cu = await goi('get', `/api/hoa-don/${hd.ma_hoa_don}`, 'nhanvien');
  assert.equal(cu.status, 403);
  assert.equal(cu.body.loi, 'KHONG_DU_QUYEN');
  assert.equal((await goi('get', `/api/hoa-don/${hd.ma_hoa_don}`, 'quanly')).status, 200);
  assert.equal((await goi('get', `/api/hoa-don/${hd.ma_hoa_don}`, 'admin')).status, 200);
});

test('danh sách order: hóa đơn đã thanh toán hiện số tiền đã chốt', async () => {
  await datTon(100, 50);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 1 }]);
  await tra(hd.ma_hoa_don);
  const res = await goi('get', '/api/hoa-don?trang_thai=da_thanh_toan&moi_trang=200', 'quanly');
  const dong = res.body.data.find(h => h.ma_hoa_don === hd.ma_hoa_don);
  assert.equal(dong.tong_tien, 10000);
  assert.equal(dong.trang_thai, 'da_thanh_toan');
});
