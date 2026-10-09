// Test POS-08 (thanh toán) và POS-11 (xem/in hóa đơn). Dữ liệu riêng TEST_TT_*: không đụng kho/khách mẫu.
// Sản phẩm TEST_TT_SP (10.000đ): công thức 20g NL1 + 5g NL2 mỗi ly. NL1 tồn 100g (mức tối thiểu 70g), NL2 tồn 50g.
// QUY TẮC KHO MỚI: kho đã bị trừ từ lúc GỌI MÓN, nên thanh toán KHÔNG trừ và KHÔNG kiểm tra kho nữa.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'khoa-chi-dung-cho-test';
const { test, before, after, beforeEach } = require('node:test');
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


const { voiKhoaTrigger } = require('./_tien-ich-snapshot');
// Tháo/dựng trigger phải giữ khóa chung với các file test khác (chạy song song)
const donDep = () => voiKhoaTrigger(pool, donDepKhongKhoa);
async function donDepKhongKhoa() {
  // Chỉ dùng trong CSDL test/local.
  // Tạm tháo trigger DELETE để dọn snapshot test cũ.
  await pool.query(
    'DROP TRIGGER IF EXISTS trg_readonly_hoadondathanhtoan_delete'
  );

  try {
    // Tìm tất cả hóa đơn thuộc khách test
    // hoặc có chứa sản phẩm TEST_TT_*.
    const [rows] = await pool.query(`
      SELECT DISTINCT h.ma_hoa_don
      FROM HoaDon h
      LEFT JOIN KhachHang k
        ON k.ma_khach_hang = h.ma_khach_hang
      LEFT JOIN ChiTietHoaDon c
        ON c.ma_hoa_don = h.ma_hoa_don
      LEFT JOIN SanPham s
        ON s.ma_san_pham = c.ma_san_pham
      WHERE k.ten_khach_hang LIKE 'TEST\\_TT\\_%'
         OR s.ten_san_pham LIKE 'TEST\\_TT\\_%'
    `);

    // Gộp hóa đơn test cũ với hóa đơn tạo trong lần chạy này.
    const ids = [
      ...new Set([
        ...taoRa.map(Number),
        ...rows.map(r => Number(r.ma_hoa_don))
      ])
    ];

    if (ids.length > 0) {
      // Xóa snapshot trước vì bảng này tham chiếu HoaDon.
      await pool.query(
        'DELETE FROM HoaDonDaThanhToan WHERE ma_hoa_don IN (?)',
        [ids]
      );

      // Xóa chi tiết trước hóa đơn để tránh lỗi khóa ngoại.
      await pool.query(
        'DELETE FROM ChiTietHoaDon WHERE ma_hoa_don IN (?)',
        [ids]
      );

      await pool.query(
        'DELETE FROM HoaDon WHERE ma_hoa_don IN (?)',
        [ids]
      );
    }

    // Dọn các dữ liệu phụ được tạo riêng cho test.
    await pool.query(`
      DELETE ct FROM CongThuc ct
      JOIN SanPham s ON s.ma_san_pham = ct.ma_san_pham
      WHERE s.ten_san_pham LIKE 'TEST\\_TT\\_%'
    `);

    await pool.query(`
      DELETE FROM SanPham
      WHERE ten_san_pham LIKE 'TEST\\_TT\\_%'
    `);

    await pool.query(`
      DELETE FROM NguyenLieu
      WHERE ten_nguyen_lieu LIKE 'TEST\\_TT\\_%'
    `);

    await pool.query(`
      DELETE FROM KhachHang
      WHERE ten_khach_hang LIKE 'TEST\\_TT\\_%'
    `);

    await pool.query(`
      DELETE FROM DanhMuc
      WHERE ten_danh_muc LIKE 'TEST\\_TT\\_%'
    `);

    taoRa.length = 0;
  } finally {
    // Khôi phục trigger để các test kiểm tra
    // khả năng chặn UPDATE/DELETE vẫn có ý nghĩa.
    await pool.query(`
      CREATE TRIGGER trg_readonly_hoadondathanhtoan_delete
      BEFORE DELETE ON HoaDonDaThanhToan
      FOR EACH ROW
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT =
        'LỖI: Bảng HoaDonDaThanhToan chỉ được phép thêm mới, tuyệt đối không được sửa hay xóa!'
    `);
  }
}

beforeEach((t) => {
  process.stderr.write(`[TEST START] ${t.name}\n`);
});

before(async () => {
  process.stderr.write('[SETUP 1] Bắt đầu dọn dữ liệu\n');
  await donDep();

  process.stderr.write('[SETUP 2] Dọn dữ liệu xong\n');

  for (const [ten, mk] of [
    ['admin', 'Admin@123'],
    ['quanly', 'Quanly@123'],
    ['nhanvien', 'Nhanvien@123']
  ]) {
    process.stderr.write(`[SETUP 3] Đang đăng nhập: ${ten}\n`);

    const res = await request(app)
      .post('/api/auth/dang-nhap')
      .timeout({ response: 5000, deadline: 10000 })
      .send({
        ten_dang_nhap: ten,
        mat_khau: mk
      });

    process.stderr.write(
      `[SETUP 4] Đăng nhập ${ten}: HTTP ${res.status}\n`
    );

    token[ten] = res.body?.data?.token;

    assert.ok(
      token[ten],
      `Đăng nhập ${ten} thất bại: ${JSON.stringify(res.body)}`
    );
  }
  const dm = (await pool.query("INSERT INTO DanhMuc (ten_danh_muc) VALUES ('TEST_TT_DM')"))[0].insertId;
  sp = (await pool.query('INSERT INTO SanPham (ma_danh_muc, ten_san_pham, gia_ban) VALUES (?, ?, 10000)', [dm, 'TEST_TT_SP']))[0].insertId;
  nl1 = (await pool.query("INSERT INTO NguyenLieu (ten_nguyen_lieu, don_vi_tinh, so_luong_ton, muc_ton_toi_thieu) VALUES ('TEST_TT_NL1', 'g', 100, 70)"))[0].insertId;
  nl2 = (await pool.query("INSERT INTO NguyenLieu (ten_nguyen_lieu, don_vi_tinh, so_luong_ton, muc_ton_toi_thieu) VALUES ('TEST_TT_NL2', 'g', 50, 0)"))[0].insertId;
  await pool.query('INSERT INTO CongThuc (ma_san_pham, ma_nguyen_lieu, dinh_luong) VALUES (?, ?, 20), (?, ?, 5)', [sp, nl1, sp, nl2]);
  kh = (await pool.query("INSERT INTO KhachHang (ten_khach_hang, so_dien_thoai) VALUES ('TEST_TT_KH', '0999000222')"))[0].insertId;
});
after(async () => {
  try {
    await donDep();
  } catch (err) {
    console.error('[LỖI DỌN DỮ LIỆU]', err);
    throw err;
  } finally {
    await pool.end();
  }
});

// ---------- POS-08: thanh toán ----------
test('thanh toán: chốt tổng từ các dòng (kể cả sau khi sửa), cộng điểm, KHÔNG đụng kho (đã trừ lúc gọi)', async () => {
  await datTon(100, 50); await datDiem(0);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 1 }, { ma_san_pham: 7, so_luong: 1 }], kh); // 10.000 + 45.000
  assert.equal(await ton(nl1), 80, 'gọi 1 ly -> trừ 20g NGAY');
  assert.equal(await ton(nl2), 45);
  const sua = await goi('patch', `/api/hoa-don/${hd.ma_hoa_don}/dong/${hd.chi_tiet[0].ma_chi_tiet}`).send({ so_luong: 2 }); // 20.000 + 45.000
  assert.equal(await ton(nl1), 60, 'tăng lên 2 ly -> trừ thêm 20g');
  assert.deepEqual(sua.body.data.canh_bao_kho, [{ ma_nguyen_lieu: nl1, ten_nguyen_lieu: 'TEST_TT_NL1', don_vi_tinh: 'g', so_luong_ton: 60, muc_ton_toi_thieu: 70 }],
    'cảnh báo sắp hết xuất hiện lúc GỌI MÓN: NL1 còn 60g <= mức 70g; NL2 thì chưa');

  const res = await tra(hd.ma_hoa_don, 'chuyen_khoan');
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const d = res.body.data;
  assert.equal(d.hoa_don.trang_thai, 'da_thanh_toan');
  assert.equal(d.hoa_don.phuong_thuc_thanh_toan, 'chuyen_khoan');
  assert.equal(d.hoa_don.tong_tien, 65000);
  assert.equal(d.diem_cong, 6, 'floor(65.000 / 10.000)');
  assert.equal(d.diem_hien_tai, 6);
  assert.equal(d.canh_bao_kho, undefined, 'thanh toán không còn liên quan tới kho');
  assert.equal(await ton(nl1), 60, 'thanh toán không trừ thêm');
  assert.equal(await ton(nl2), 40);

  const [rows] = await pool.query('SELECT trang_thai, phuong_thuc_thanh_toan, tong_tien FROM HoaDon WHERE ma_hoa_don = ?', [hd.ma_hoa_don]);
  assert.deepEqual({ ...rows[0], tong_tien: Number(rows[0].tong_tien) }, { trang_thai: 'da_thanh_toan', phuong_thuc_thanh_toan: 'chuyen_khoan', tong_tien: 65000 });
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

test('thanh toán: khách vãng lai không có điểm; làm tròn xuống', async () => {
  await datTon(100, 50);
  const hd = await taoOrder([{ ma_san_pham: 7, so_luong: 1 }]); // 45.000, không công thức, không khách
  const res = await tra(hd.ma_hoa_don);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.diem_cong, 0);
  assert.equal(res.body.data.diem_hien_tai, null);
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
  const [rows] = await pool.query('SELECT trang_thai FROM HoaDon WHERE ma_hoa_don = ?', [hd.ma_hoa_don]);
  assert.equal(rows[0].trang_thai, 'dang_pha_che', 'đầu vào sai thì hóa đơn không đổi');
});

test('thanh toán hai lần: lần 2 bị 409; kho giữ nguyên số đã trừ lúc gọi, điểm không bị cộng lại', async () => {
  await datTon(100, 50); await datDiem(0);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 1 }], kh); // gọi: trừ 20g/5g
  assert.equal(await ton(nl1), 80);
  assert.equal((await tra(hd.ma_hoa_don)).status, 200);
  const lan2 = await tra(hd.ma_hoa_don);
  assert.equal(lan2.status, 409);
  assert.equal(lan2.body.loi, 'HOA_DON_DA_DONG');
  assert.equal(await ton(nl1), 80, 'trả tiền không đổi kho');
  assert.equal(await ton(nl2), 45);
  assert.equal(await diemKhach(), 1);
});

test('đã hủy thì không thanh toán được; hủy đã trả nguyên liệu lúc hủy, không cộng điểm', async () => {
  await datTon(100, 50); await datDiem(0);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 2 }], kh);
  assert.equal(await ton(nl1), 60);
  await goi('post', `/api/hoa-don/${hd.ma_hoa_don}/huy`);
  assert.equal(await ton(nl1), 100, 'hủy order chưa làm: trả đủ nguyên liệu');
  const res = await tra(hd.ma_hoa_don);
  assert.equal(res.status, 409);
  assert.equal(res.body.loi, 'HOA_DON_DA_DONG');
  assert.equal(await ton(nl1), 100);
  assert.equal(await diemKhach(), 0);
});

test('thanh toán không kiểm tra kho: dù tồn đã về 0 (vì đã dùng hết lúc gọi) vẫn thu tiền được, tồn không âm', async () => {
  await datTon(100, 50);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 5 }]); // 100g -> NL1 còn 0
  assert.equal(await ton(nl1), 0);
  const res = await tra(hd.ma_hoa_don);
  assert.equal(res.status, 200, 'đã trừ đủ lúc gọi nên thanh toán không cần kho');
  assert.equal(res.body.data.hoa_don.tong_tien, 50000);
  assert.equal(await ton(nl1), 0, 'không bị trừ thêm nên không âm');
  assert.equal(await ton(nl2), 25);
});

test('bấm thanh toán nhiều lần cùng lúc trên một hóa đơn: chỉ một lần có hiệu lực, điểm chỉ cộng một lần', async () => {
  await datTon(100, 50); await datDiem(0);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 1 }], kh);
  const kq = await Promise.all([1, 2, 3, 4].map(() => tra(hd.ma_hoa_don)));
  assert.equal(kq.filter(r => r.status === 200).length, 1, kq.map(r => r.status).join(','));
  assert.equal(kq.filter(r => r.status === 409 && r.body.loi === 'HOA_DON_DA_DONG').length, 3);
  assert.equal(await ton(nl1), 80, 'kho giữ nguyên số đã trừ lúc gọi');
  assert.equal(await diemKhach(), 1, 'cộng điểm đúng một lần');
});

test('sửa và thanh toán cùng lúc: kết quả luôn nhất quán (tổng tiền khớp các dòng còn lại)', async () => {
  const hd = await taoOrder([{ ma_san_pham: 7, so_luong: 1 }, { ma_san_pham: 7, so_luong: 1, ghi_chu: 'dòng 2' }]);
  const [sua, pay] = await Promise.all([
    goi('delete', `/api/hoa-don/${hd.ma_hoa_don}/dong/${hd.chi_tiet[1].ma_chi_tiet}`),
    tra(hd.ma_hoa_don),
  ]);
  assert.equal(pay.status, 200);
  const [rows] = await pool.query('SELECT COALESCE(SUM(so_luong * don_gia - giam_gia), 0) AS tong FROM ChiTietHoaDon WHERE ma_hoa_don = ?', [hd.ma_hoa_don]);
  const [hoaDon] = await pool.query('SELECT tong_tien FROM HoaDon WHERE ma_hoa_don = ?', [hd.ma_hoa_don]);
  assert.equal(Number(hoaDon[0].tong_tien), Number(rows[0].tong), `sửa=${sua.status}: tổng đã chốt phải khớp các dòng còn lại`);
  assert.ok([200, 409].includes(sua.status));
  assert.equal(sua.status === 200 ? 45000 : 90000, Number(hoaDon[0].tong_tien), 'xóa kịp trước khi trả: 45.000; xóa chậm (bị chặn 409): 90.000');
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

// ---------- KIỂM TRA BẢNG LƯU HÓA ĐƠN ĐÃ THANH TOÁN ----------
test('thanh toán thành công: snapshot phải được lưu vào bảng HoaDonDaThanhToan', async () => {
  await datTon(100, 50); await datDiem(0);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 2 }], kh);

  // Thanh toán
  const payRes = await tra(hd.ma_hoa_don, 'chuyen_khoan');
  assert.equal(payRes.status, 200, JSON.stringify(payRes.body));

  // Truy vấn trực tiếp vào bảng HoaDonDaThanhToan
  const [rows] = await pool.query(
    'SELECT ma_hoa_don, phuong_thuc_thanh_toan, tong_tien, diem_cong FROM HoaDonDaThanhToan WHERE ma_hoa_don = ?',
    [hd.ma_hoa_don]
  );

  assert.equal(rows.length, 1, 'Phải có 1 dòng lưu trong HoaDonDaThanhToan');
  const snapshot = rows[0];
  assert.equal(snapshot.phuong_thuc_thanh_toan, 'chuyen_khoan');
  assert.equal(Number(snapshot.tong_tien), 20000, '2 ly x 10.000đ');
  assert.equal(snapshot.diem_cong, payRes.body.data.diem_cong, 'Điểm cộng lưu trong bảng phải khớp với API trả về');
});

test('thanh toán 2 lần (lỗi 409): bảng HoaDonDaThanhToan không bị ghi đè hay ghi thêm dòng dư', async () => {
  await datTon(100, 50); await datDiem(0);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 1 }], kh);

  // Lần 1: Thành công
  const lan1 = await tra(hd.ma_hoa_don, 'tien_mat');
  assert.equal(lan1.status, 200, JSON.stringify(lan1.body));

  // Lần 2: Cố tình thanh toán lại với phương thức khác -> Lỗi 409
  const lan2 = await tra(hd.ma_hoa_don, 'chuyen_khoan');
  assert.equal(lan2.status, 409, 'Lần 2 phải bị chặn và trả về lỗi xung đột');

  // Đếm số dòng trong HoaDonDaThanhToan
  const [rows] = await pool.query(
    'SELECT COUNT(*) as tong, MAX(phuong_thuc_thanh_toan) as pt FROM HoaDonDaThanhToan WHERE ma_hoa_don = ?',
    [hd.ma_hoa_don]
  );

  assert.equal(Number(rows[0].tong), 1, 'Chỉ được phép có 1 dòng duy nhất');
  assert.equal(rows[0].pt, 'tien_mat', 'Phương thức thanh toán phải giữ nguyên là tiền mặt, không bị ghi đè thành chuyển khoản');
});

test('trigger CSDL: chặn đứng UPDATE và DELETE trên bảng HoaDonDaThanhToan', async () => {
  await datTon(100, 50); await datDiem(0);
  const hd = await taoOrder([{ ma_san_pham: sp, so_luong: 1 }], kh);

  const payRes = await tra(hd.ma_hoa_don, 'tien_mat');
  assert.equal(payRes.status, 200);

  await voiKhoaTrigger(pool, async () => {
    // Dùng assert.rejects để bắt lỗi văng ra từ MySQL (từ khóa kiểm tra lấy từ cấu hình Trigger)
    await assert.rejects(
      pool.query('UPDATE HoaDonDaThanhToan SET tong_tien = 99999 WHERE ma_hoa_don = ?', [hd.ma_hoa_don]),
      /sửa hay xóa/i,
      'Phải văng lỗi từ Trigger khi cố tình UPDATE'
    );

    await assert.rejects(
      pool.query('DELETE FROM HoaDonDaThanhToan WHERE ma_hoa_don = ?', [hd.ma_hoa_don]),
      /sửa hay xóa/i,
      'Phải văng lỗi từ Trigger khi cố tình DELETE'
    );
  });
});
