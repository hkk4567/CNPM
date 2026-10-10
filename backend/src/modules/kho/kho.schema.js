// kho – schema kiểm tra đầu vào (zod). 8a: KHO-01 nguyên liệu, KHO-02 nhà cung cấp, KHO-06 tồn kho.
// 8b sẽ thêm: KHO-03 công thức, KHO-04 phiếu nhập, KHO-05 lịch sử nhập.
const { z } = require('zod');

const so = ten => ({ error: `${ten} phải là số nguyên dương` });
const ma = z.object({ ma: z.coerce.number(so('mã')).int(so('mã')).positive(so('mã')) });

const chuoi = (ten, toiDa) => z.string({ error: `${ten} phải là chuỗi` }).trim()
  .min(1, `${ten} không được rỗng`).max(toiDa, `${ten} tối đa ${toiDa} ký tự`);

// Số lượng kho: DECIMAL(14,3) -> không âm, tối đa 3 chữ số thập phân, không vượt 99.999.999.999,999
const soKho = ten => z.number({ error: `${ten} phải là số` })
  .min(0, `${ten} không được âm`).max(99999999999.999, `${ten} quá lớn`)
  .refine(n => Math.abs(n * 1000 - Math.round(n * 1000)) < 1e-6, `${ten} tối đa 3 chữ số thập phân`);

const phan_trang = {
  trang: z.coerce.number(so('trang')).int(so('trang')).min(1, 'trang tối thiểu là 1').optional(),
  moi_trang: z.coerce.number(so('moi_trang')).int(so('moi_trang')).min(1, 'moi_trang tối thiểu là 1').max(100, 'moi_trang tối đa 100').optional(),
};
const tuKhoa = z.string().trim().min(1, 'tu_khoa không được rỗng').max(100, 'tu_khoa tối đa 100 ký tự').optional();

// ---------- KHO-01 nguyên liệu ----------
// strict: gửi so_luong_ton (hoặc trường lạ) bị 400 — tồn chỉ đổi qua nhập hàng / trừ kho khi bán, không sửa tay.
const tenNl = chuoi('ten_nguyen_lieu', 100);
const donVi = chuoi('don_vi_tinh', 20);
const mucToiThieu = soKho('muc_ton_toi_thieu');
const CAM_TON = 'Chỉ nhận ten_nguyen_lieu, don_vi_tinh, muc_ton_toi_thieu (so_luong_ton chỉ đổi qua nhập hàng và bán hàng)';

const taoNguyenLieu = z.object({
  ten_nguyen_lieu: tenNl, don_vi_tinh: donVi, muc_ton_toi_thieu: mucToiThieu.optional(),
}).strict({ error: CAM_TON });

const suaNguyenLieu = z.object({
  ten_nguyen_lieu: tenNl, don_vi_tinh: donVi, muc_ton_toi_thieu: mucToiThieu,
}).strict({ error: CAM_TON }).partial()
  .refine(o => Object.keys(o).length > 0, { error: 'Cần ít nhất một trường để sửa' });

const danhSachNguyenLieuQuery = z.object({ tu_khoa: tuKhoa, ...phan_trang });

// ---------- KHO-02 nhà cung cấp ----------
// SĐT bàn/di động Việt Nam: bắt đầu bằng 0, 10–11 chữ số. null = xóa số.
const sdt = z.string({ error: 'so_dien_thoai phải là chuỗi' }).trim().regex(/^0\d{9,10}$/, 'so_dien_thoai phải gồm 10–11 chữ số và bắt đầu bằng 0');
const diaChi = chuoi('dia_chi', 255);
const CAM_NCC = 'Chỉ nhận ten_ncc, so_dien_thoai, dia_chi';

const taoNcc = z.object({
  ten_ncc: chuoi('ten_ncc', 150), so_dien_thoai: sdt.nullable().optional(), dia_chi: diaChi.nullable().optional(),
}).strict({ error: CAM_NCC });

const suaNcc = z.object({
  ten_ncc: chuoi('ten_ncc', 150), so_dien_thoai: sdt.nullable(), dia_chi: diaChi.nullable(),
}).strict({ error: CAM_NCC }).partial()
  .refine(o => Object.keys(o).length > 0, { error: 'Cần ít nhất một trường để sửa' });

const danhSachNccQuery = z.object({ tu_khoa: tuKhoa, ...phan_trang });

// ---------- KHO-06 ----------
const tonKhoQuery = z.object({
  chi_sap_het: z.enum(['true', 'false'], { error: 'chi_sap_het chỉ nhận true hoặc false' }).transform(v => v === 'true').optional(),
  tu_khoa: tuKhoa,
});

// ---------- KHO-03 công thức ----------
const maDuong = ten => z.number({ error: `${ten} phải là số nguyên dương` }).int(`${ten} phải là số nguyên dương`).positive(`${ten} phải là số nguyên dương`);
const soDuong3 = ten => z.number({ error: `${ten} phải là số` }).gt(0, `${ten} phải lớn hơn 0`).max(99999999999.999, `${ten} quá lớn`)
  .refine(n => Math.abs(n * 1000 - Math.round(n * 1000)) < 1e-6, `${ten} tối đa 3 chữ số thập phân`);
const khongTrung = (ds, truong) => new Set(ds.map(x => x[truong])).size === ds.length;

// Mảng RỖNG hợp lệ = xóa công thức (sản phẩm không công thức thì không giới hạn theo kho)
const datCongThuc = z.object({
  nguyen_lieu: z.array(z.object({ ma_nguyen_lieu: maDuong('ma_nguyen_lieu'), dinh_luong: soDuong3('dinh_luong') })
    .strict({ error: 'Mỗi dòng chỉ nhận ma_nguyen_lieu và dinh_luong' }), { error: 'nguyen_lieu phải là mảng' })
    .max(50, 'tối đa 50 nguyên liệu mỗi công thức')
    .refine(ds => khongTrung(ds, 'ma_nguyen_lieu'), 'ma_nguyen_lieu bị lặp trong công thức'),
}).strict({ error: 'Chỉ nhận nguyen_lieu' });

// ---------- KHO-04 phiếu nhập ----------
// Thời điểm đầy đủ ngày + giờ (cùng quy ước khuyến mãi): không kèm múi giờ = giờ máy chủ. Không cho ở tương lai (quá 5 phút).
const thoiDiem = z.string({ error: 'ngay_nhap phải là chuỗi ngày giờ' }).trim()
  .regex(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/, 'ngay_nhap phải có dạng YYYY-MM-DDTHH:mm[:ss] (có thể kèm múi giờ)')
  .transform(x => new Date(x.replace(' ', 'T')))
  .refine(d => !Number.isNaN(d.getTime()), 'ngay_nhap không hợp lệ')
  .refine(d => d.getTime() <= Date.now() + 5 * 60 * 1000, 'ngay_nhap không được ở tương lai');

const donGia = z.number({ error: 'don_gia_nhap phải là số' }).gt(0, 'don_gia_nhap phải lớn hơn 0').max(9999999999.99, 'don_gia_nhap quá lớn')
  .refine(n => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'don_gia_nhap tối đa 2 chữ số thập phân');

const taoPhieuNhap = z.object({
  ma_ncc: maDuong('ma_ncc'),
  ngay_nhap: thoiDiem.optional(),
  items: z.array(z.object({ ma_nguyen_lieu: maDuong('ma_nguyen_lieu'), so_luong_nhap: soDuong3('so_luong_nhap'), don_gia_nhap: donGia })
    .strict({ error: 'Mỗi dòng chỉ nhận ma_nguyen_lieu, so_luong_nhap, don_gia_nhap' }), { error: 'items phải là mảng' })
    .min(1, 'items cần ít nhất 1 dòng').max(100, 'items tối đa 100 dòng')
    .refine(ds => khongTrung(ds, 'ma_nguyen_lieu'), 'ma_nguyen_lieu bị lặp trong phiếu (gộp thành một dòng)'),
}).strict({ error: 'Chỉ nhận ma_ncc, ngay_nhap, items' });

// ---------- KHO-05 lịch sử nhập ----------
const ngayLoc = ten => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${ten} phải có dạng YYYY-MM-DD`)
  .refine(x => { const d = new Date(`${x}T00:00:00Z`); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === x; }, `${ten} không hợp lệ`);
const lichSuNhapQuery = z.object({
  tu_ngay: ngayLoc('tu_ngay').optional(), den_ngay: ngayLoc('den_ngay').optional(),
  ma_ncc: z.coerce.number(so('ma_ncc')).int(so('ma_ncc')).positive(so('ma_ncc')).optional(), ...phan_trang,
}).refine(q => !q.tu_ngay || !q.den_ngay || q.tu_ngay <= q.den_ngay, { error: 'tu_ngay không được sau den_ngay' });

module.exports = {
  datCongThuc, taoPhieuNhap, lichSuNhapQuery,
  ma, taoNguyenLieu, suaNguyenLieu, danhSachNguyenLieuQuery, taoNcc, suaNcc, danhSachNccQuery, tonKhoQuery,
};
