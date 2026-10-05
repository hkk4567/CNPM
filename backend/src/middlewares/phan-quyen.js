// choPhep('admin', 'quan_ly'): chỉ cho các quyền liệt kê đi tiếp. Dùng SAU xacThuc.
const { loi } = require('../utils/loi-nghiep-vu');

const QUYEN = { ADMIN: 'admin', QUAN_LY: 'quan_ly', NHAN_VIEN: 'nhan_vien' };

const choPhep = (...quyen) => (req, res, next) => {
  if (!req.nguoi_dung) return next(loi.chuaDangNhap());
  if (!quyen.includes(req.nguoi_dung.quyen_truy_cap)) return next(loi.khongDuQuyen());
  next();
};

module.exports = { choPhep, QUYEN };
