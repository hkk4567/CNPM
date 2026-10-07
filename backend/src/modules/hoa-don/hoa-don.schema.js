// hoa-don – schema kiểm tra đầu vào (zod). POS-02: tạo order; POS-10: danh sách order.
const { z } = require('zod');

const soNguyen = (ten, thongBao) => z.number({ error: thongBao || `${ten} phải là số nguyên dương` }).int(thongBao || `${ten} phải là số nguyên dương`);

const dong = z.object({
  ma_san_pham: soNguyen('ma_san_pham').positive('ma_san_pham phải là số nguyên dương'),
  so_luong: soNguyen('so_luong', 'so_luong phải là số nguyên từ 1 đến 99').min(1, 'so_luong phải từ 1 đến 99').max(99, 'so_luong phải từ 1 đến 99'),
  ghi_chu: z.string({ error: 'ghi_chu phải là chuỗi' }).trim().max(255, 'ghi_chu tối đa 255 ký tự').nullable().optional(),
});

const taoOrder = z.object({
  ma_khach_hang: soNguyen('ma_khach_hang').positive('ma_khach_hang phải là số nguyên dương').nullable().optional(),
  items: z.array(dong, { error: 'items phải là mảng các món' }).min(1, 'items không được rỗng').max(50, 'items tối đa 50 dòng'),
});

const ngay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'ngay phải có dạng YYYY-MM-DD')
  .refine(s => { const d = new Date(`${s}T00:00:00Z`); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; }, 'ngay không hợp lệ');

const so = ten => ({ error: `${ten} phải là số nguyên dương` });

const danhSachQuery = z.object({
  ngay: ngay.optional(),
  trang_thai: z.enum(['dang_pha_che', 'da_phuc_vu', 'da_thanh_toan', 'huy'], { error: 'trang_thai không hợp lệ' }).optional(),
  ma_nhan_vien: z.coerce.number(so('ma_nhan_vien')).int(so('ma_nhan_vien')).positive(so('ma_nhan_vien')).optional(),
  trang: z.coerce.number(so('trang')).int(so('trang')).min(1, 'trang tối thiểu là 1').optional(),
  moi_trang: z.coerce.number(so('moi_trang')).int(so('moi_trang')).min(1, 'moi_trang tối thiểu là 1').max(200, 'moi_trang tối đa 200').optional(),
});

const maDuong = ten => z.coerce.number({ error: `${ten} phải là số nguyên dương` }).int(`${ten} phải là số nguyên dương`).positive(`${ten} phải là số nguyên dương`);

// Tham số trên đường dẫn
const ma = z.object({ ma: maDuong('ma') });
const maVaChiTiet = z.object({ ma: maDuong('ma'), ma_chi_tiet: maDuong('ma_chi_tiet') });

// "Đã làm": số ly (trong phần bị bỏ) đã pha xong nên nguyên liệu KHÔNG được trả lại kho. Mặc định 0 = chưa làm = trả lại hết.
const soDaLam = z.number({ error: 'da_lam phải là số nguyên từ 0 đến 99' }).int('da_lam phải là số nguyên từ 0 đến 99')
  .min(0, 'da_lam phải từ 0 đến 99').max(99, 'da_lam phải từ 0 đến 99');
const daLamTheoDong = z.array(z.object({
  ma_chi_tiet: soNguyen('ma_chi_tiet').positive('ma_chi_tiet phải là số nguyên dương'),
  so_luong: soDaLam,
}), { error: 'da_lam phải là mảng các {ma_chi_tiet, so_luong}' }).max(50, 'da_lam tối đa 50 dòng');

// POS-04: sửa dòng. ghi_chu = null hoặc rỗng nghĩa là xóa ghi chú. da_lam chỉ dùng khi GIẢM số lượng.
const suaDong = z.object({
  so_luong: dong.shape.so_luong,
  ghi_chu: dong.shape.ghi_chu,
  da_lam: soDaLam,
}).partial().refine(o => Object.keys(o).length > 0, { error: 'Cần ít nhất một trường để sửa (so_luong hoặc ghi_chu)' });

// POS-07
const doiTrangThai = z.object({
  trang_thai_moi: z.enum(['dang_pha_che', 'da_phuc_vu', 'da_thanh_toan', 'huy'], { error: 'trang_thai_moi phải là dang_pha_che, da_phuc_vu, da_thanh_toan hoặc huy' }),
  da_lam: daLamTheoDong.optional(), // chỉ dùng khi trang_thai_moi = huy
});

// POS-05: DELETE /dong/:ma_chi_tiet?da_lam=2 (số ly của dòng đã làm xong)
const xoaDongQuery = z.object({
  da_lam: z.coerce.number({ error: 'da_lam phải là số nguyên từ 0 đến 99' }).int('da_lam phải là số nguyên từ 0 đến 99')
    .min(0, 'da_lam phải từ 0 đến 99').max(99, 'da_lam phải từ 0 đến 99').optional(),
});

// POS-09
const huy = z.object({ da_lam: daLamTheoDong.optional() });

// POS-08
const thanhToan = z.object({
  phuong_thuc_thanh_toan: z.enum(['tien_mat', 'chuyen_khoan', 'vi'], { error: 'phuong_thuc_thanh_toan phải là tien_mat, chuyen_khoan hoặc vi' }),
});

module.exports = { taoOrder, danhSachQuery, dong, ma, maVaChiTiet, suaDong, doiTrangThai, xoaDongQuery, huy, thanhToan };
