// khuyen-mai – schema kiểm tra đầu vào (zod). KM-01 tạo, KM-02 sửa, KM-03 xóa, KM-04/05 gán/gỡ sản phẩm, KM-06 danh sách.
const { z } = require('zod');

const so = (ten, kieu = 'nguyên dương') => ({ error: `${ten} phải là số ${kieu}` });
const maDuong = ten => z.coerce.number(so(ten)).int(so(ten)).positive(so(ten));

const ma = z.object({ ma: maDuong('mã') });
const maVaSanPham = z.object({ ma: maDuong('mã'), ma_san_pham: maDuong('ma_san_pham') });

// Thời điểm đầy đủ ngày + giờ: 2026-10-20T08:00, 2026-10-20 08:00:00 hoặc có múi giờ (Z, +07:00). Không có múi giờ = giờ của máy chủ
// (cùng giờ với NOW() của CSDL). Không nhận chỉ-ngày vì JS hiểu "2026-10-20" là 00:00 UTC, dễ lệch giờ.
const thoiDiem = ten => z.string({ error: `${ten} phải là chuỗi ngày giờ` }).trim()
  .regex(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/, `${ten} phải có dạng YYYY-MM-DDTHH:mm[:ss] (có thể kèm múi giờ)`)
  .transform(s => new Date(s.replace(' ', 'T')))
  .refine(d => !Number.isNaN(d.getTime()), `${ten} không hợp lệ`);

const truongKhuyenMai = {
  ten_khuyen_mai: z.string({ error: 'ten_khuyen_mai phải là chuỗi' }).trim().min(1, 'ten_khuyen_mai không được rỗng').max(150, 'ten_khuyen_mai tối đa 150 ký tự'),
  loai_giam: z.enum(['phan_tram', 'so_tien'], { error: 'loai_giam phải là phan_tram hoặc so_tien' }),
  gia_tri_giam: z.number({ error: 'gia_tri_giam phải là số' }).gt(0, 'gia_tri_giam phải lớn hơn 0').max(100000000, 'gia_tri_giam quá lớn'),
  ngay_bat_dau: thoiDiem('ngay_bat_dau'),
  ngay_ket_thuc: thoiDiem('ngay_ket_thuc'),
};

const danhSachMaSanPham = z.array(
  z.number({ error: 'ma_san_pham phải là số nguyên dương' }).int('ma_san_pham phải là số nguyên dương').positive('ma_san_pham phải là số nguyên dương'),
  { error: 'ma_san_pham phải là mảng mã sản phẩm' }).max(100, 'tối đa 100 sản phẩm mỗi lần');

// Quy tắc dùng chung cho KM-01 và KM-02 (KM-02 kiểm tra lại trên giá trị SAU khi gộp với dữ liệu cũ, xem service)
const kiemTraGiaTri = { loai_giam: 'phan_tram', toiDa: 100 };
const thongBaoPhanTram = 'gia_tri_giam theo phần trăm phải trong khoảng (0, 100]';
const thongBaoNgay = 'ngay_bat_dau phải trước ngay_ket_thuc';

const taoKhuyenMai = z.object({
  ...truongKhuyenMai,
  ma_san_pham: danhSachMaSanPham.optional(),
}).strict({ error: 'Có trường không được hỗ trợ' })
  .refine(d => d.loai_giam !== kiemTraGiaTri.loai_giam || d.gia_tri_giam <= kiemTraGiaTri.toiDa, { error: thongBaoPhanTram, path: ['gia_tri_giam'] })
  .refine(d => d.ngay_bat_dau < d.ngay_ket_thuc, { error: thongBaoNgay, path: ['ngay_bat_dau'] });

const suaKhuyenMai = z.object(truongKhuyenMai).partial()
  .strict({ error: 'Chỉ được sửa ten_khuyen_mai, loai_giam, gia_tri_giam, ngay_bat_dau, ngay_ket_thuc (đổi sản phẩm dùng KM-04/KM-05)' })
  .refine(o => Object.keys(o).length > 0, { error: 'Cần ít nhất một trường để sửa' });

const themSanPham = z.object({
  ma_san_pham: danhSachMaSanPham.min(1, 'ma_san_pham không được rỗng'),
});

const danhSachQuery = z.object({
  trang_thai: z.enum(['sap_dien_ra', 'dang_chay', 'het_han'], { error: 'trang_thai phải là sap_dien_ra, dang_chay hoặc het_han' }).optional(),
  ma_san_pham: maDuong('ma_san_pham').optional(),
  trang: z.coerce.number(so('trang')).int(so('trang')).min(1, 'trang tối thiểu là 1').optional(),
  moi_trang: z.coerce.number(so('moi_trang')).int(so('moi_trang')).min(1, 'moi_trang tối thiểu là 1').max(100, 'moi_trang tối đa 100').optional(),
});

const ngayLoc = ten => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${ten} phải có dạng YYYY-MM-DD`)
  .refine(s => { const d = new Date(`${s}T00:00:00Z`); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; }, `${ten} không hợp lệ`);

// KM-07
const baoCaoQuery = z.object({ tu_ngay: ngayLoc('tu_ngay').optional(), den_ngay: ngayLoc('den_ngay').optional() })
  .refine(q => !q.tu_ngay || !q.den_ngay || q.tu_ngay <= q.den_ngay, { error: 'tu_ngay không được sau den_ngay' });

module.exports = { baoCaoQuery, ma, maVaSanPham, taoKhuyenMai, suaKhuyenMai, themSanPham, danhSachQuery, thongBaoPhanTram, thongBaoNgay };
