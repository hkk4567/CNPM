// auth – schema kiểm tra đầu vào (zod). AUTH-01: đăng nhập.
const { z } = require('zod');

const dangNhap = z.object({
  ten_dang_nhap: z.string({ error: 'Thiếu ten_dang_nhap' }).trim().min(1, 'ten_dang_nhap không được rỗng').max(50, 'ten_dang_nhap tối đa 50 ký tự'),
  mat_khau: z.string({ error: 'Thiếu mat_khau' }).min(1, 'mat_khau không được rỗng').max(72, 'mat_khau tối đa 72 ký tự'),
});

module.exports = { dangNhap };
