// hoa-don – nghiệp vụ. POS-02: tạo order; POS-10: danh sách; POS-03/04/05: sửa dòng; POS-07: đổi trạng thái; POS-09: hủy.
// POS-08: thanh toán (chốt tiền + cộng điểm + trừ kho); POS-11: xem/in hóa đơn.
// Module khác chỉ gọi qua service: san-pham, khach-hang, kho.
const repo = require('./hoa-don.repository');
const sanPhamService = require('../san-pham/san-pham.service');
const khachHangService = require('../khach-hang/khach-hang.service');
const khoService = require('../kho/kho.service');
const { loi } = require('../../utils/loi-nghiep-vu');
const { withTransaction } = require('../../utils/transaction');

const lamTronTien = n => Math.round(n * 100) / 100;
const KHOA_SO_THU_TU = 'so_thu_tu_hoa_don';

const DIEM_MOI_VND = 10000; // cứ 10.000đ của tổng tiền = 1 điểm (làm tròn xuống)

// tong_tien_tam_tinh luôn tính từ các dòng; tong_tien chỉ có giá trị (số đã chốt) sau khi thanh toán, trước đó là null.
function dinhDang(hoaDon) {
  const { tong_tien: daChot, ...phan } = hoaDon;
  const tongHang = hoaDon.chi_tiet.reduce((s, c) => s + c.so_luong * c.don_gia, 0);
  const tongGiam = hoaDon.chi_tiet.reduce((s, c) => s + c.giam_gia, 0);
  return {
    ...phan,
    tong_tien_hang: lamTronTien(tongHang),
    tong_giam_gia: lamTronTien(tongGiam),
    tong_tien_tam_tinh: lamTronTien(tongHang - tongGiam),
    tong_tien: hoaDon.trang_thai === 'da_thanh_toan' ? daChot : null,
  };
}

async function taoOrder(nguoiDung, { ma_khach_hang = null, items }) {
  // 1. Sản phẩm: tồn tại và còn bán (đọc giá lúc này để chụp lại vào dòng hóa đơn)
  const dsMa = [...new Set(items.map(i => i.ma_san_pham))];
  const dsSanPham = await sanPhamService.layNhieuSanPham(dsMa);
  const theoMa = new Map(dsSanPham.map(s => [s.ma_san_pham, s]));
  const khongCo = dsMa.filter(m => !theoMa.has(m));
  if (khongCo.length) throw loi.khongTimThay(`Không tìm thấy sản phẩm: ${khongCo.join(', ')}`);
  const ngungBan = dsSanPham.filter(s => s.trang_thai !== 'con_ban');
  if (ngungBan.length) {
    throw loi.yeuCauSai('SAN_PHAM_NGUNG_BAN', `Sản phẩm đã ngừng bán: ${ngungBan.map(s => s.ten_san_pham).join(', ')}`,
      ngungBan.map(s => ({ ma_san_pham: s.ma_san_pham, ten_san_pham: s.ten_san_pham })));
  }

  // 2. Khách thành viên (nếu có)
  if (ma_khach_hang !== null) await khachHangService.layKhachHang(ma_khach_hang);

  // 3. Đủ nguyên liệu cho TẤT CẢ các dòng (báo sớm; thanh toán sẽ kiểm tra lại)
  await khoService.kiemTraDuNguyenLieu(items.map(i => ({ ma_san_pham: i.ma_san_pham, so_luong: i.so_luong })));

  // 4. Ghi hóa đơn. Khóa nối tiếp để so_thu_tu (reset mỗi ngày) không bị trùng khi nhiều order tạo cùng lúc.
  //    Khuyến mãi: giam_gia = 0, ma_khuyen_mai = NULL cho đến Sprint 3.
  const hoaDon = await withTransaction(async conn => {
    const so_thu_tu = await repo.soThuTuTiepTheo(conn);
    const ma = await repo.taoHoaDon({ ma_khach_hang, ma_nhan_vien: nguoiDung.ma_nhan_vien, so_thu_tu }, conn);
    await repo.themChiTiet(ma, items.map(i => ({
      ma_san_pham: i.ma_san_pham,
      ma_khuyen_mai: null,
      so_luong: i.so_luong,
      don_gia: theoMa.get(i.ma_san_pham).gia_ban,
      giam_gia: 0,
      ghi_chu: i.ghi_chu,
    })), conn);
    return repo.layHoaDon(ma, conn);
  }, { khoa: KHOA_SO_THU_TU });
  return dinhDang(hoaDon);
}

async function layDanhSach(nguoiDung, query, phanTrang) {
  // Nhân viên chỉ xem order của hôm nay; quản lý/admin xem được ngày khác
  if (nguoiDung.quyen_truy_cap === 'nhan_vien' && query.ngay && query.ngay !== (await repo.homNay())) {
    throw loi.khongDuQuyen('Nhân viên chỉ được xem order của hôm nay');
  }
  return repo.danhSach(query, phanTrang);
}

// ---------- Chỉnh sửa order ----------
const CHUYEN_HOP_LE = { dang_pha_che: ['da_phuc_vu', 'huy'], da_phuc_vu: ['huy'] };
const NHAN_DA_DONG = { da_thanh_toan: 'đã thanh toán', huy: 'đã hủy' };

// Mọi thao tác sửa chạy trong transaction, KHÓA dòng hóa đơn trước, rồi mới kiểm tra trạng thái:
// nhờ vậy sửa và thanh toán cùng lúc trên một hóa đơn không thể xen kẽ nhau.
async function khoaOrderDangMo(ma, conn) {
  const hd = await repo.khoaHoaDon(ma, conn);
  if (!hd) throw loi.khongTimThay('Không tìm thấy hóa đơn');
  if (NHAN_DA_DONG[hd.trang_thai]) {
    throw loi.xungDot('HOA_DON_DA_DONG', `Hóa đơn ${NHAN_DA_DONG[hd.trang_thai]}, không thay đổi được`);
  }
  return hd;
}

function trongOrder(ma, thucHien) {
  return withTransaction(async conn => {
    const hd = await khoaOrderDangMo(ma, conn);
    await thucHien(conn, hd);
    return dinhDang(await repo.layHoaDon(ma, conn));
  });
}

const sangDongNhuCau = dongs => dongs.map(d => ({ ma_san_pham: d.ma_san_pham, so_luong: d.so_luong }));

// POS-03: luôn thêm DÒNG MỚI (cùng sản phẩm, ghi chú khác là hai dòng). Kiểm tra nguyên liệu cho TOÀN BỘ order sau khi thêm.
function themDong(ma, { ma_san_pham, so_luong, ghi_chu }) {
  return trongOrder(ma, async conn => {
    const [sp] = await sanPhamService.layNhieuSanPham([ma_san_pham], conn);
    if (!sp) throw loi.khongTimThay(`Không tìm thấy sản phẩm: ${ma_san_pham}`);
    if (sp.trang_thai !== 'con_ban') {
      throw loi.yeuCauSai('SAN_PHAM_NGUNG_BAN', `Sản phẩm đã ngừng bán: ${sp.ten_san_pham}`, [{ ma_san_pham: sp.ma_san_pham, ten_san_pham: sp.ten_san_pham }]);
    }
    const hienCo = await repo.layDongCuaHoaDon(ma, conn);
    await khoService.kiemTraDuNguyenLieu([...sangDongNhuCau(hienCo), { ma_san_pham, so_luong }], conn);
    await repo.themChiTiet(ma, [{ ma_san_pham, ma_khuyen_mai: null, so_luong, don_gia: sp.gia_ban, giam_gia: 0, ghi_chu }], conn);
  });
}

// POS-04: đổi số lượng giữ nguyên mức giảm trên mỗi ly (giam_gia tính lại theo tỷ lệ; Sprint 3 sẽ tính lại từ khuyến mãi).
// Chỉ kiểm tra nguyên liệu khi TĂNG nhu cầu: giảm số lượng luôn được phép, kể cả khi kho đã xuống thấp.
function suaDong(ma, maChiTiet, { so_luong, ghi_chu }) {
  return trongOrder(ma, async conn => {
    const dong = await repo.timDong(maChiTiet, ma, conn);
    if (!dong) throw loi.khongTimThay('Không tìm thấy dòng món trong hóa đơn');
    const capNhat = {};
    if (ghi_chu !== undefined) capNhat.ghi_chu = ghi_chu || null;
    if (so_luong !== undefined && so_luong !== dong.so_luong) {
      capNhat.so_luong = so_luong;
      capNhat.giam_gia = lamTronTien((dong.giam_gia / dong.so_luong) * so_luong);
      if (so_luong > dong.so_luong) {
        const tatCa = await repo.layDongCuaHoaDon(ma, conn);
        await khoService.kiemTraDuNguyenLieu(
          sangDongNhuCau(tatCa.map(d => (d.ma_chi_tiet === maChiTiet ? { ...d, so_luong } : d))), conn);
      }
    }
    if (Object.keys(capNhat).length) await repo.suaDong(maChiTiet, capNhat, conn);
  });
}

// POS-05: không xóa dòng cuối cùng (phải hủy order)
function xoaDong(ma, maChiTiet) {
  return trongOrder(ma, async conn => {
    const tatCa = await repo.layDongCuaHoaDon(ma, conn);
    if (!tatCa.some(d => d.ma_chi_tiet === maChiTiet)) throw loi.khongTimThay('Không tìm thấy dòng món trong hóa đơn');
    if (tatCa.length === 1) {
      throw loi.xungDot('KHONG_XOA_DONG_CUOI', 'Order chỉ còn một dòng; hãy hủy order thay vì xóa dòng cuối');
    }
    await repo.xoaDong(maChiTiet, conn);
  });
}

// POS-07: dang_pha_che -> da_phuc_vu; dang_pha_che/da_phuc_vu -> huy. Thanh toán dùng POS-08. Hóa đơn đã đóng không đổi được.
function doiTrangThai(ma, trangThaiMoi) {
  return trongOrder(ma, async (conn, hd) => {
    if (trangThaiMoi === 'da_thanh_toan') {
      throw loi.xungDot('CHUYEN_TRANG_THAI_KHONG_HOP_LE', 'Chuyển sang đã thanh toán bằng chức năng thanh toán, không dùng đổi trạng thái');
    }
    if (!(CHUYEN_HOP_LE[hd.trang_thai] || []).includes(trangThaiMoi)) {
      throw loi.xungDot('CHUYEN_TRANG_THAI_KHONG_HOP_LE', `Không thể chuyển từ ${hd.trang_thai} sang ${trangThaiMoi}`);
    }
    await repo.doiTrangThai(ma, trangThaiMoi, conn);
  });
}

// POS-09: hủy order = chuyển sang huy. Không trừ kho (kho chỉ trừ lúc thanh toán).
const huy = ma => doiTrangThai(ma, 'huy');

// POS-08: thanh toán, TẤT CẢ trong một transaction (một bước lỗi thì hủy hết, không để kho/điểm/tiền lệch nhau).
// Thứ tự khóa luôn là: HoaDon -> NguyenLieu (theo mã tăng dần) -> KhachHang, nên không deadlock với các thao tác khác.
//  1. khóa hóa đơn, kiểm tra còn mở (đã thanh toán/đã hủy: 409)  2. chốt tổng tiền từ các dòng
//  3. kiểm tra lại đủ nguyên liệu và trừ kho (thiếu: 409 KHONG_DU_NGUYEN_LIEU, CHECK ở CSDL là chốt chặn cuối)
//  4. ghi trạng thái da_thanh_toan  5. cộng điểm cho khách thành viên
function thanhToan(ma, { phuong_thuc_thanh_toan }) {
  return withTransaction(async conn => {
    await khoaOrderDangMo(ma, conn);
    const dongs = await repo.layDongCuaHoaDon(ma, conn);
    const tong = lamTronTien(dongs.reduce((s, d) => s + d.so_luong * d.don_gia - d.giam_gia, 0));
    if (tong < 0) throw loi.xungDot('TONG_TIEN_KHONG_HOP_LE', 'Tổng tiền hóa đơn bị âm (mức giảm lớn hơn tiền hàng)');

    const { canh_bao_kho } = await khoService.truKho(sangDongNhuCau(dongs), conn);

    if ((await repo.chotThanhToan(ma, phuong_thuc_thanh_toan, tong, conn)) !== 1) {
      throw loi.xungDot('HOA_DON_DA_DONG', 'Hóa đơn đã thanh toán, không thay đổi được');
    }
    const hoaDon = await repo.layHoaDon(ma, conn);
    const coKhach = hoaDon.ma_khach_hang !== null;
    const diemCong = coKhach ? Math.floor(tong / DIEM_MOI_VND) : 0;
    const diemHienTai = coKhach ? await khachHangService.congDiem(hoaDon.ma_khach_hang, diemCong, conn) : null;

    return { hoa_don: dinhDang(hoaDon), diem_cong: diemCong, diem_hien_tai: diemHienTai, canh_bao_kho };
  });
}

// POS-11: xem/in hóa đơn. Nhân viên chỉ xem hóa đơn của hôm nay (cùng quy tắc với danh sách POS-10).
async function layHoaDonChiTiet(nguoiDung, ma) {
  const hoaDon = await repo.layHoaDon(ma);
  if (!hoaDon) throw loi.khongTimThay('Không tìm thấy hóa đơn');
  if (nguoiDung.quyen_truy_cap === 'nhan_vien' && !(await repo.laHoaDonHomNay(ma))) {
    throw loi.khongDuQuyen('Nhân viên chỉ được xem hóa đơn của hôm nay');
  }
  return dinhDang(hoaDon);
}

module.exports = { taoOrder, layDanhSach, themDong, suaDong, xoaDong, doiTrangThai, huy, thanhToan, layHoaDonChiTiet };
