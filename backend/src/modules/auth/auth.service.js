// auth – nghiệp vụ. AUTH-01: đăng nhập; AUTH-02: đổi mật khẩu; xacThucToken dùng cho middleware xac-thuc.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jwt: cauHinhJwt } = require('../../config/env');
const repo = require('./auth.repository');
const { loi } = require('../../utils/loi-nghiep-vu');
const { withTransaction } = require('../../utils/transaction');

const VONG_BAM = 10; // cùng chi phí bcrypt với dữ liệu mẫu (scripts/hash-password.js)

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

// AUTH-02: đổi mật khẩu của CHÍNH người đang đăng nhập (A/Q/N). Thứ tự: mật khẩu cũ đúng (401) -> mới khác cũ (400).
// Băm ngoài transaction (bcrypt chậm, không giữ khóa dòng lâu). Các token đã cấp vẫn dùng được đến khi hết hạn (không có cột phiên bản mật khẩu).
async function doiMatKhau(nguoiDung, { mat_khau_cu, mat_khau_moi }) {
  const hashMoi = await bcrypt.hash(mat_khau_moi, VONG_BAM);
  return withTransaction(async conn => {
    const tk = await repo.khoaTaiKhoan(nguoiDung.ma_tai_khoan, conn);
    if (!tk) throw loi.chuaDangNhap('TOKEN_KHONG_HOP_LE', 'Tài khoản không còn hiệu lực');
    if (!(await bcrypt.compare(mat_khau_cu, tk.mat_khau_hash))) throw loi.chuaDangNhap('SAI_MAT_KHAU_CU', 'Mật khẩu cũ không đúng');
    if (await bcrypt.compare(mat_khau_moi, tk.mat_khau_hash)) throw loi.yeuCauSai('MAT_KHAU_MOI_TRUNG_CU', 'Mật khẩu mới phải khác mật khẩu cũ');
    await repo.datMatKhau(tk.ma_tai_khoan, hashMoi, conn);
    return { da_doi: true };
  });
}

module.exports = { dangNhap, doiMatKhau, xacThucToken, VONG_BAM };
