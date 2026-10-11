// nhan-su – nghiệp vụ. 9a: NS-01 tạo nhân viên + tài khoản, NS-02 sửa/đổi quyền, NS-03 xóa/cho nghỉ việc, danh sách, chi tiết.
// 9b: NS-04 CRUD ca làm việc, NS-05 xếp lịch, NS-06 xóa phân công, NS-07 lịch tuần.
// MỌI thao tác ghi nhân sự chạy dưới khóa tên 'nhan_su' (GET_LOCK) nên nối tiếp nhau: không thể hai admin cùng hạ quyền/cho nghỉ nhau
// để hệ thống còn 0 admin, và không phải lo thứ tự khóa dòng giữa các thao tác.
const bcrypt = require('bcryptjs');
const repo = require('./nhan-su.repository');
const { VONG_BAM } = require('../auth/auth.service');
const { withTransaction } = require('../../utils/transaction');
const { loi } = require('../../utils/loi-nghiep-vu');

const KHOA = 'nhan_su';
const ERR_TRUNG = 1062;
const laAdmin = nd => nd.quyen_truy_cap === 'admin';
const loiKhongCo = () => loi.khongTimThay('Không tìm thấy nhân viên');
const loiTrungTenDangNhap = () => loi.xungDot('TRUNG_TEN_DANG_NHAP', 'Tên đăng nhập đã tồn tại');
const hash = mk => bcrypt.hash(mk, VONG_BAM); // băm NGOÀI transaction: bcrypt chậm, không giữ khóa

// NS-01 (chỉ admin: route chặn). Một transaction: NhanVien + TaiKhoan; lỗi trùng tên đăng nhập thì không để lại nhân viên mồ côi.
async function taoNhanVien(d) {
  const mat_khau_hash = await hash(d.mat_khau);
  try {
    return await withTransaction(async conn => {
      const ma = await repo.taoNhanVien(d, conn);
      await repo.taoTaiKhoan({ ma_nhan_vien: ma, ten_dang_nhap: d.ten_dang_nhap, mat_khau_hash, quyen_truy_cap: d.quyen_truy_cap }, conn);
      return repo.timNhanVien(ma, conn);
    }, { khoa: KHOA });
  } catch (e) {
    throw e.errno === ERR_TRUNG ? loiTrungTenDangNhap() : e;
  }
}

async function layNhanVien(ma) {
  const nv = await repo.timNhanVien(ma);
  if (!nv) throw loiKhongCo();
  return nv;
}

const danhSachNhanVien = (loc, phanTrang) => repo.danhSachNhanVien(loc, phanTrang);

// NS-02. Admin: sửa mọi thứ (kể cả quyen_truy_cap, đặt lại mat_khau). Quản lý: chỉ sửa họ tên/chức vụ/SĐT và KHÔNG đụng tài khoản admin.
// Không cho hạ quyền admin cuối cùng (409 ADMIN_CUOI_CUNG).
async function suaNhanVien(nguoiDung, ma, d) {
  const mat_khau_hash = d.mat_khau !== undefined ? await hash(d.mat_khau) : null;
  return withTransaction(async conn => {
    const nv = await repo.khoaNhanVien(ma, conn);
    if (!nv) throw loiKhongCo();
    if (!laAdmin(nguoiDung)) {
      if (d.quyen_truy_cap !== undefined || d.mat_khau !== undefined) throw loi.khongDuQuyen('Chỉ admin được đổi quyền hoặc đặt lại mật khẩu');
      if (nv.quyen_truy_cap === 'admin') throw loi.khongDuQuyen('Quản lý không được sửa tài khoản admin');
    }
    if ((d.quyen_truy_cap !== undefined || d.mat_khau !== undefined) && !nv.ma_tai_khoan) {
      throw loi.xungDot('NHAN_VIEN_KHONG_CO_TAI_KHOAN', 'Nhân viên này không có tài khoản đăng nhập');
    }
    if (d.quyen_truy_cap !== undefined && nv.quyen_truy_cap === 'admin' && d.quyen_truy_cap !== 'admin'
        && nv.trang_thai === 'dang_lam' && (await repo.demAdminDangLam(conn)) <= 1) {
      throw loi.xungDot('ADMIN_CUOI_CUNG', 'Không thể hạ quyền admin cuối cùng của hệ thống');
    }
    await repo.suaThongTin(ma, d, conn);
    if (d.quyen_truy_cap !== undefined && d.quyen_truy_cap !== nv.quyen_truy_cap) await repo.doiQuyen(ma, d.quyen_truy_cap, conn);
    if (mat_khau_hash) await repo.datMatKhau(ma, mat_khau_hash, conn);
    return repo.timNhanVien(ma, conn);
  }, { khoa: KHOA });
}

// NS-03 (chỉ admin). Chưa có hóa đơn/phiếu nhập/phân công cũ -> xóa hẳn (kèm tài khoản và phân công tương lai): { da_xoa: true }.
// Đã có lịch sử -> KHÔNG xóa, đặt nghi_viec (bị chặn đăng nhập ngay, token cũ mất hiệu lực) và gỡ phân công từ hôm nay: { da_xoa: false, trang_thai: 'nghi_viec' }.
// 409: tự xóa chính mình (KHONG_XOA_CHINH_MINH), xóa admin cuối cùng (ADMIN_CUOI_CUNG).
function xoaNhanVien(nguoiDung, ma) {
  return withTransaction(async conn => {
    const nv = await repo.khoaNhanVien(ma, conn);
    if (!nv) throw loiKhongCo();
    if (nv.ma_nhan_vien === nguoiDung.ma_nhan_vien) throw loi.xungDot('KHONG_XOA_CHINH_MINH', 'Không thể tự xóa hoặc cho chính mình nghỉ việc');
    if (nv.quyen_truy_cap === 'admin' && nv.trang_thai === 'dang_lam' && (await repo.demAdminDangLam(conn)) <= 1) {
      throw loi.xungDot('ADMIN_CUOI_CUNG', 'Không thể xóa admin cuối cùng của hệ thống');
    }
    const ls = await repo.lichSuLienQuan(ma, conn);
    const phanCongDaGo = await repo.goPhanCongTuongLai(ma, conn);
    if (ls.hoa_don || ls.phieu_nhap || ls.phan_cong_cu) {
      await repo.datNghiViec(ma, conn);
      return { da_xoa: false, trang_thai: 'nghi_viec', ly_do: ls, so_phan_cong_da_go: phanCongDaGo };
    }
    await repo.xoaTaiKhoan(ma, conn);
    await repo.xoaNhanVien(ma, conn);
    return { da_xoa: true };
  }, { khoa: KHOA });
}

// ---------- NS-04: ca làm việc ----------
// Ca không qua nửa đêm: bắt đầu < kết thúc (kiểm tra trên giá trị SAU khi gộp với dữ liệu cũ, như KM-02).
const loiKhongCoCa = () => loi.khongTimThay('Không tìm thấy ca làm việc');
function kiemTraGioCa(ca) {
  if (!(ca.thoi_gian_bat_dau < ca.thoi_gian_ket_thuc)) {
    throw loi.duLieuSai(undefined, [{ noi: 'body', truong: 'thoi_gian_ket_thuc', thong_bao: 'thoi_gian_bat_dau phải sớm hơn thoi_gian_ket_thuc (ca qua đêm hãy tách thành hai ca)' }]);
  }
}
async function taoCa(d) {
  kiemTraGioCa(d);
  return repo.timCa(await repo.taoCa(d));
}
const danhSachCa = () => repo.tatCaCa();
async function layCa(ma) {
  const ca = await repo.timCa(ma);
  if (!ca) throw loiKhongCoCa();
  return ca;
}
function suaCa(ma, d) {
  return withTransaction(async conn => {
    const cu = await repo.khoaCa(ma, conn);
    if (!cu) throw loiKhongCoCa();
    kiemTraGioCa({ ...cu, ...d });
    await repo.suaCa(ma, d, conn);
    return repo.timCa(ma, conn);
  });
}
// Xóa: chặn nếu đã có PhanCong (409). Khóa dòng ca trước; xếp lịch khóa chia sẻ cùng dòng nên không lọt phân công vừa tạo; khóa ngoại là chốt cuối.
async function xoaCa(ma) {
  const loiDangDung = () => loi.xungDot('CA_DA_CO_PHAN_CONG', 'Ca đã có phân công, không thể xóa');
  try {
    return await withTransaction(async conn => {
      if (!(await repo.khoaCa(ma, conn))) throw loiKhongCoCa();
      if (await repo.caDaCoPhanCong(ma, conn)) throw loiDangDung();
      await repo.xoaCa(ma, conn);
      return { ma_ca: ma, da_xoa: true };
    });
  } catch (e) {
    if (e.errno === 1451) throw loiDangDung();
    throw e;
  }
}

// ---------- NS-05: xếp lịch ----------
// Thứ tự khóa: NhanVien (chia sẻ) -> CaLamViec (chia sẻ). Tất cả hoặc không: nếu BẤT KỲ ngày nào đã xếp rồi thì 409 và không tạo gì.
async function xepLich({ ma_nhan_vien, ma_ca, ngay_lam }) {
  const dsNgay = [...new Set(Array.isArray(ngay_lam) ? ngay_lam : [ngay_lam])].sort();
  const loiTrung = ds => loi.xungDot('DA_XEP_LICH', `Nhân viên đã được xếp ca này vào: ${ds.join(', ')}`, { ngay_da_xep: ds });
  try {
    return await withTransaction(async conn => {
      const nv = await repo.khoaNhanVienDeXep(ma_nhan_vien, conn);
      if (!nv) throw loi.khongTimThay('Không tìm thấy nhân viên');
      if (nv.trang_thai !== 'dang_lam') throw loi.xungDot('NHAN_VIEN_NGHI_VIEC', 'Nhân viên đã nghỉ việc, không xếp ca được');
      if (!(await repo.khoaCaDeXep(ma_ca, conn))) throw loiKhongCoCa();
      const { d: homNay } = await repo.homNay(conn);
      const qua = dsNgay.filter(d => d < homNay);
      if (qua.length) throw loi.duLieuSai(undefined, [{ noi: 'body', truong: 'ngay_lam', thong_bao: `Chỉ xếp lịch từ hôm nay (${homNay}) trở đi; ngày đã qua: ${qua.join(', ')}` }]);
      const daXep = await repo.ngayDaXep(ma_nhan_vien, ma_ca, dsNgay, conn);
      if (daXep.length) throw loiTrung(daXep);
      await repo.themPhanCong(ma_nhan_vien, ma_ca, dsNgay, conn);
      return repo.layPhanCong(ma_nhan_vien, ma_ca, dsNgay, conn);
    });
  } catch (e) {
    if (e.errno === 1062) throw loiTrung(dsNgay); // hai yêu cầu xếp cùng lúc: khóa chính chặn
    throw e;
  }
}

// ---------- NS-06 ----------
async function goPhanCong({ ma_nhan_vien, ma_ca, ngay_lam }) {
  const n = await withTransaction(conn => repo.goPhanCong(ma_nhan_vien, ma_ca, ngay_lam, conn));
  if (!n) throw loi.khongTimThay('Không tìm thấy phân công này');
  return { da_xoa: true };
}

// ---------- NS-07 ----------
// Nhân viên (N) chỉ xem lịch CỦA MÌNH: bỏ trống ma_nhan_vien = của mình; xin người khác -> 403. A/Q xem tất cả hoặc lọc theo ma_nhan_vien.
async function lichTuan(nguoiDung, { tu_ngay, ma_nhan_vien }) {
  let maNv = ma_nhan_vien;
  if (nguoiDung.quyen_truy_cap === 'nhan_vien') {
    if (maNv !== undefined && maNv !== nguoiDung.ma_nhan_vien) throw loi.khongDuQuyen('Nhân viên chỉ được xem lịch làm việc của mình');
    maNv = nguoiDung.ma_nhan_vien;
  }
  const tuNgay = tu_ngay || (await repo.homNay()).thu_hai;
  const rows = await repo.lichTuan(tuNgay, maNv);
  const den = new Date(`${tuNgay}T00:00:00Z`); den.setUTCDate(den.getUTCDate() + 6);
  return { tu_ngay: tuNgay, den_ngay: den.toISOString().slice(0, 10), rows };
}

module.exports = {
  taoNhanVien, layNhanVien, danhSachNhanVien, suaNhanVien, xoaNhanVien,
  taoCa, danhSachCa, layCa, suaCa, xoaCa, xepLich, goPhanCong, lichTuan,
};
