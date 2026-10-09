// khach-hang – schema kiểm tra đầu vào (zod). KH-01 tạo, KH-02 sửa, KH-03 tìm, KH-04 lịch sử mua; POS-06 dùng soDienThoai.
const { z } = require('zod');

const so = ten => ({ error: `${ten} phải là số nguyên dương` });

const ma = z.object({ ma: z.coerce.number(so('mã')).int(so('mã')).positive(so('mã')) });

// SĐT Việt Nam: 10 chữ số, bắt đầu bằng 0 (khớp dữ liệu mẫu, cột VARCHAR(15))
const soDienThoai = z.string({ error: 'so_dien_thoai phải là chuỗi' }).trim()
  .regex(/^0\d{9}$/, 'so_dien_thoai phải gồm 10 chữ số và bắt đầu bằng 0');
const tenKhach = z.string({ error: 'ten_khach_hang phải là chuỗi' }).trim()
  .min(1, 'ten_khach_hang không được rỗng').max(100, 'ten_khach_hang tối đa 100 ký tự');

const taoKhach = z.object({
  ten_khach_hang: tenKhach,
  so_dien_thoai: soDienThoai,
}).strict({ error: 'Chỉ nhận ten_khach_hang và so_dien_thoai (điểm luôn bắt đầu từ 0)' });

// strict: gửi diem_tich_luy (hoặc trường lạ) bị từ chối 400 chứ không âm thầm bỏ qua -> điểm không sửa trực tiếp được
const suaKhach = z.object({ ten_khach_hang: tenKhach, so_dien_thoai: soDienThoai })
  .strict({ error: 'Chỉ được sửa ten_khach_hang và so_dien_thoai (không sửa trực tiếp diem_tich_luy)' }).partial()
  .refine(o => Object.keys(o).length > 0, { error: 'Cần ít nhất một trường để sửa (ten_khach_hang hoặc so_dien_thoai)' });

const timKhachQuery = z.object({
  tu_khoa: z.string({ error: 'Thiếu tu_khoa' }).trim().min(1, 'tu_khoa không được rỗng').max(100, 'tu_khoa tối đa 100 ký tự'),
});

const ngay = ten => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${ten} phải có dạng YYYY-MM-DD`)
  .refine(s => { const d = new Date(`${s}T00:00:00Z`); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; }, `${ten} không hợp lệ`);

const lichSuQuery = z.object({
  tu_ngay: ngay('tu_ngay').optional(),
  den_ngay: ngay('den_ngay').optional(),
  trang: z.coerce.number(so('trang')).int(so('trang')).min(1, 'trang tối thiểu là 1').optional(),
  moi_trang: z.coerce.number(so('moi_trang')).int(so('moi_trang')).min(1, 'moi_trang tối thiểu là 1').max(100, 'moi_trang tối đa 100').optional(),
}).refine(q => !q.tu_ngay || !q.den_ngay || q.tu_ngay <= q.den_ngay, { error: 'tu_ngay không được sau den_ngay' });

// POS-06
const ganKhach = z.object({ so_dien_thoai: soDienThoai });

module.exports = { ma, taoKhach, suaKhach, timKhachQuery, lichSuQuery, ganKhach };
