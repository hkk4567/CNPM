// san-pham – schema kiểm tra đầu vào (zod). Phụ trách SP-01..SP-05 (danh mục, sản phẩm) và POS-01 (menu).
const { z } = require('zod');

const so = (ten, kieu = 'nguyên dương') => ({ error: `${ten} phải là số ${kieu}` });

const ma = z.object({ ma: z.coerce.number(so('mã')).int(so('mã')).positive(so('mã')) });

const tenDanhMuc = z.object({
  ten_danh_muc: z.string({ error: 'Thiếu ten_danh_muc' }).trim().min(1, 'ten_danh_muc không được rỗng').max(100, 'ten_danh_muc tối đa 100 ký tự'),
});

const maDanhMucLoc = z.coerce.number(so('ma_danh_muc')).int(so('ma_danh_muc')).positive(so('ma_danh_muc'));
const tuKhoa = z.string().trim().max(100, 'tu_khoa tối đa 100 ký tự');
const trangThai = z.enum(['con_ban', 'ngung_ban'], { error: 'trang_thai phải là con_ban hoặc ngung_ban' });

const thongTinSanPham = {
  ma_danh_muc: z.number({ error: 'ma_danh_muc phải là số nguyên dương' }).int('ma_danh_muc phải là số nguyên dương').positive('ma_danh_muc phải là số nguyên dương'),
  ten_san_pham: z.string({ error: 'Thiếu ten_san_pham' }).trim().min(1, 'ten_san_pham không được rỗng').max(150, 'ten_san_pham tối đa 150 ký tự'),
  gia_ban: z.number({ error: 'gia_ban phải là số' }).min(0, 'gia_ban không được âm').max(100000000, 'gia_ban quá lớn'),
};

const taoSanPham = z.object({ ...thongTinSanPham, trang_thai: trangThai.optional() });

const suaSanPham = z.object({ ...thongTinSanPham, trang_thai: trangThai }).partial()
  .refine(o => Object.keys(o).length > 0, { error: 'Cần ít nhất một trường để sửa' });

const phanTrang = {
  trang: z.coerce.number(so('trang')).int(so('trang')).min(1, 'trang tối thiểu là 1').optional(),
  moi_trang: z.coerce.number(so('moi_trang')).int(so('moi_trang')).min(1, 'moi_trang tối thiểu là 1').max(100, 'moi_trang tối đa 100').optional(),
};

const menuQuery = z.object({ ma_danh_muc: maDanhMucLoc.optional(), tu_khoa: tuKhoa.optional() });
const danhSachQuery = z.object({ ma_danh_muc: maDanhMucLoc.optional(), tu_khoa: tuKhoa.optional(), trang_thai: trangThai.optional(), ...phanTrang });

module.exports = { ma, tenDanhMuc, taoSanPham, suaSanPham, menuQuery, danhSachQuery };
