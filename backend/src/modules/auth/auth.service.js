// auth – nghiệp vụ. AUTH-01: đăng nhập; xacThucToken dùng cho middleware xac-thuc.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jwt: cauHinhJwt } = require('../../config/env');
const repo = require('./auth.repository');
const { loi } = require('../../utils/loi-nghiep-vu');

// So sánh giả khi không có tài khoản: thời gian phản hồi không lộ tên đăng nhập nào tồn tại
const HASH_GIA = bcrypt.hashSync('khong-ton-tai', 10);

const trichNguoiDung = r => ({
  ma_tai_khoan: r.ma_tai_khoan,
  ma_nhan_vien: r.ma_nhan_vien,
  ho_ten: r.ho_ten,
  quyen_truy_cap: r.quyen_truy_cap,
});

async function dangNhap({ ten_dang_nhap, mat_khau }) {
  const tk = await repo.timTheoTenDangNhap(ten_dang_nhap);
  const dungMatKhau = await bcrypt.compare(mat_khau, tk ? tk.mat_khau_hash : HASH_GIA);
  if (!tk || !dungMatKhau) throw loi.chuaDangNhap('SAI_THONG_TIN', 'Sai tên đăng nhập hoặc mật khẩu');
  // Chỉ báo khóa SAU khi đúng mật khẩu, để không lộ tài khoản nào tồn tại
  if (tk.trang_thai !== 'dang_lam') throw loi.khongDuQuyen('Tài khoản đã bị khóa (nhân viên đã nghỉ việc)', 'TAI_KHOAN_BI_KHOA');

  const token = jwt.sign({ sub: String(tk.ma_tai_khoan) }, cauHinhJwt.secret, { expiresIn: cauHinhJwt.expiresIn });
  return { token, nguoi_dung: trichNguoiDung(tk) };
}

// Kiểm tra token VÀ tra lại CSDL: đổi quyền hoặc cho nghỉ việc có hiệu lực ngay, không đợi token hết hạn
async function xacThucToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, cauHinhJwt.secret, { algorithms: ['HS256'] });
  } catch (e) {
    throw e.name === 'TokenExpiredError'
      ? loi.chuaDangNhap('TOKEN_HET_HAN', 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại')
      : loi.chuaDangNhap('TOKEN_KHONG_HOP_LE', 'Token không hợp lệ');
  }
  const tk = await repo.timTheoMaTaiKhoan(Number(payload.sub));
  if (!tk || tk.trang_thai !== 'dang_lam') throw loi.chuaDangNhap('TOKEN_KHONG_HOP_LE', 'Tài khoản không còn hiệu lực');
  return trichNguoiDung(tk);
}

module.exports = { dangNhap, xacThucToken };
