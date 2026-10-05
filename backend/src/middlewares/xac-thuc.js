// Kiểm tra Authorization: Bearer <token>; gắn req.nguoi_dung = { ma_tai_khoan, ma_nhan_vien, ho_ten, quyen_truy_cap }.
const authService = require('../modules/auth/auth.service');
const { loi } = require('../utils/loi-nghiep-vu');

async function xacThuc(req, res, next) {
  const [kieu, token] = (req.headers.authorization || '').split(' ');
  if (kieu !== 'Bearer' || !token) throw loi.chuaDangNhap();
  req.nguoi_dung = await authService.xacThucToken(token);
  next();
}

module.exports = xacThuc;
