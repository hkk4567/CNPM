// nhan-su – schema kiểm tra đầu vào (zod). 9a: NS-01 tạo, NS-02 sửa, NS-03 xóa + danh sách/chi tiết. 9b thêm ca làm việc, phân công, lịch tuần.
const { z } = require('zod');
const { matKhauMoi } = require('../auth/auth.schema');

const so = ten => ({ error: `${ten} phải là số nguyên dương` });
const ma = z.object({ ma: z.coerce.number(so('mã')).int(so('mã')).positive(so('mã')) });

const chuoi = (ten, toiDa) => z.string({ error: `${ten} phải là chuỗi` }).trim().min(1, `${ten} không được rỗng`).max(toiDa, `${ten} tối đa ${toiDa} ký tự`);
const sdt = z.string({ error: 'so_dien_thoai phải là chuỗi' }).trim().regex(/^0\d{9,10}$/, 'so_dien_thoai phải gồm 10–11 chữ số và bắt đầu bằng 0');
const quyen = z.enum(['admin', 'quan_ly', 'nhan_vien'], { error: 'quyen_truy_cap phải là admin, quan_ly hoặc nhan_vien' });
const tenDangNhap = z.string({ error: 'Thiếu ten_dang_nhap' }).trim()
  .regex(/^[A-Za-z0-9._-]{3,50}$/, 'ten_dang_nhap gồm 3–50 ký tự: chữ không dấu, số, dấu chấm, gạch dưới, gạch ngang');

// ---------- NS-01 ----------
const taoNhanVien = z.object({
  ho_ten: chuoi('ho_ten', 100), chuc_vu: chuoi('chuc_vu', 50), so_dien_thoai: sdt.nullable().optional(),
  ten_dang_nhap: tenDangNhap, mat_khau: matKhauMoi('mat_khau'), quyen_truy_cap: quyen,
}).strict({ error: 'Chỉ nhận ho_ten, chuc_vu, so_dien_thoai, ten_dang_nhap, mat_khau, quyen_truy_cap' });

// ---------- NS-02 ----------
// quyen_truy_cap và mat_khau (đặt lại mật khẩu) chỉ admin dùng được: kiểm tra ở service (403), không phải ở schema.
// Không sửa trang_thai ở đây (nghỉ việc đi qua NS-03) và không đổi ten_dang_nhap.
const suaNhanVien = z.object({
  ho_ten: chuoi('ho_ten', 100), chuc_vu: chuoi('chuc_vu', 50), so_dien_thoai: sdt.nullable(),
  quyen_truy_cap: quyen, mat_khau: matKhauMoi('mat_khau'),
}).strict({ error: 'Chỉ nhận ho_ten, chuc_vu, so_dien_thoai, quyen_truy_cap, mat_khau' }).partial()
  .refine(o => Object.keys(o).length > 0, { error: 'Cần ít nhất một trường để sửa' });

// ---------- danh sách ----------
const phanTrang = {
  trang: z.coerce.number(so('trang')).int(so('trang')).min(1, 'trang tối thiểu là 1').optional(),
  moi_trang: z.coerce.number(so('moi_trang')).int(so('moi_trang')).min(1, 'moi_trang tối thiểu là 1').max(100, 'moi_trang tối đa 100').optional(),
};
const danhSachNhanVienQuery = z.object({
  tu_khoa: z.string().trim().min(1, 'tu_khoa không được rỗng').max(100, 'tu_khoa tối đa 100 ký tự').optional(),
  trang_thai: z.enum(['dang_lam', 'nghi_viec'], { error: 'trang_thai phải là dang_lam hoặc nghi_viec' }).optional(),
  quyen_truy_cap: quyen.optional(),
  ...phanTrang,
});

// ---------- NS-04 ca làm việc ----------
// Giờ HH:mm hoặc HH:mm:ss (00:00–23:59:59). Ca không qua nửa đêm: bat_dau < ket_thuc (ca qua đêm tách thành hai ca).
const gio = ten => z.string({ error: `${ten} phải là chuỗi giờ HH:mm` }).trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, `${ten} phải có dạng HH:mm hoặc HH:mm:ss`)
  .transform(x => (x.length === 5 ? `${x}:00` : x));
const truongCa = { ten_ca: chuoi('ten_ca', 50), thoi_gian_bat_dau: gio('thoi_gian_bat_dau'), thoi_gian_ket_thuc: gio('thoi_gian_ket_thuc') };
const CAM_CA = 'Chỉ nhận ten_ca, thoi_gian_bat_dau, thoi_gian_ket_thuc';
const taoCa = z.object(truongCa).strict({ error: CAM_CA });
const suaCa = z.object(truongCa).strict({ error: CAM_CA }).partial().refine(o => Object.keys(o).length > 0, { error: 'Cần ít nhất một trường để sửa' });

// ---------- NS-05..07 ----------
const ngay = ten => z.string({ error: `${ten} phải là chuỗi YYYY-MM-DD` }).regex(/^\d{4}-\d{2}-\d{2}$/, `${ten} phải có dạng YYYY-MM-DD`)
  .refine(x => { const d = new Date(`${x}T00:00:00Z`); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === x; }, `${ten} không hợp lệ`);
const maDuong = ten => z.number({ error: `${ten} phải là số nguyên dương` }).int(`${ten} phải là số nguyên dương`).positive(`${ten} phải là số nguyên dương`);
const maQuery = ten => z.coerce.number(so(ten)).int(so(ten)).positive(so(ten));

// NS-05: ngay_lam là một ngày hoặc mảng 1–62 ngày (không lặp). "Từ hôm nay trở đi" kiểm tra ở service (theo ngày của CSDL).
const xepLich = z.object({
  ma_nhan_vien: maDuong('ma_nhan_vien'), ma_ca: maDuong('ma_ca'),
  ngay_lam: z.union([ngay('ngay_lam'), z.array(ngay('ngay_lam'), { error: 'ngay_lam phải là một ngày hoặc mảng ngày' }).min(1, 'ngay_lam cần ít nhất 1 ngày').max(62, 'tối đa 62 ngày mỗi lần')
    .refine(ds => new Set(ds).size === ds.length, 'ngay_lam bị lặp ngày')]),
}).strict({ error: 'Chỉ nhận ma_nhan_vien, ma_ca, ngay_lam' });

// NS-06: DELETE không dùng body (nhiều client bỏ qua) nên nhận qua query
const goPhanCongQuery = z.object({ ma_nhan_vien: maQuery('ma_nhan_vien'), ma_ca: maQuery('ma_ca'), ngay_lam: ngay('ngay_lam') });

// NS-07: tu_ngay (nếu có) phải là THỨ HAI; bỏ trống = thứ Hai của tuần hiện tại
const laThuHai = x => new Date(`${x}T00:00:00Z`).getUTCDay() === 1;
const lichTuanQuery = z.object({
  tu_ngay: ngay('tu_ngay').refine(laThuHai, 'tu_ngay phải là ngày thứ Hai (đầu tuần)').optional(),
  ma_nhan_vien: maQuery('ma_nhan_vien').optional(),
});

module.exports = { ma, taoNhanVien, suaNhanVien, danhSachNhanVienQuery, phanTrang, taoCa, suaCa, xepLich, goPhanCongQuery, lichTuanQuery };
