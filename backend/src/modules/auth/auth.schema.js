// auth – schema kiểm tra đầu vào (zod). AUTH-01: đăng nhập; AUTH-02: đổi mật khẩu. matKhauMoi dùng chung với nhan-su (NS-01, NS-02).
const { z } = require('zod');

const dangNhap = z.object({
  ten_dang_nhap: z.string({ error: 'Thiếu ten_dang_nhap' }).trim().min(1, 'ten_dang_nhap không được rỗng').max(50, 'ten_dang_nhap tối đa 50 ký tự'),
  mat_khau: z.string({ error: 'Thiếu mat_khau' }).min(1, 'mat_khau không được rỗng').max(72, 'mat_khau tối đa 72 ký tự'),
});

// Mật khẩu đủ mạnh: 8–72 ký tự (bcrypt chỉ dùng 72 byte đầu), có ít nhất một chữ cái và một chữ số. Không tự cắt khoảng trắng.
const matKhauMoi = (ten = 'mat_khau_moi') => z.string({ error: `Thiếu ${ten}` })
  .min(8, `${ten} tối thiểu 8 ký tự`)
  .refine(s => Buffer.byteLength(s, 'utf8') <= 72, `${ten} tối đa 72 byte`)
  .refine(s => /\p{L}/u.test(s) && /\d/.test(s), `${ten} phải có ít nhất một chữ cái và một chữ số`);

const doiMatKhau = z.object({
  mat_khau_cu: z.string({ error: 'Thiếu mat_khau_cu' }).min(1, 'mat_khau_cu không được rỗng').max(72, 'mat_khau_cu tối đa 72 ký tự'),
  mat_khau_moi: matKhauMoi('mat_khau_moi'),
}).strict({ error: 'Chỉ nhận mat_khau_cu và mat_khau_moi' });

module.exports = { dangNhap, doiMatKhau, matKhauMoi };
