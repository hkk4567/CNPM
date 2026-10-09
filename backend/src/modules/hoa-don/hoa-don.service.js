// hoa-don – nghiệp vụ. POS-02: tạo order; POS-10: danh sách; POS-03/04/05: sửa dòng; POS-07: đổi trạng thái; POS-09: hủy.
// POS-08: thanh toán (chốt tiền + cộng điểm); POS-11: xem/in hóa đơn.
// Module khác chỉ gọi qua service: san-pham, khach-hang, kho.
//
// QUY TẮC KHO (người dùng chốt):
//  - Gọi món (tạo order / thêm món / tăng số lượng): TRỪ KHO NGAY, chỉ phần ly mới thêm. Thiếu nguyên liệu: 409, không trừ gì.
//  - Bỏ ly (xóa dòng / giảm số lượng / hủy order): ly CHƯA làm thì TRẢ nguyên liệu; ly ĐÃ làm thì nguyên liệu vẫn bị trừ.
//    Nhân viên chọn số ly đã làm bằng `da_lam` (mặc định 0 = chưa làm). Order đã phục vụ coi như làm xong hết: không trả gì.
//  - Thanh toán KHÔNG đụng kho (đã trừ từ lúc gọi). Không có nhật ký kho: chỉ cập nhật số tồn.
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

  // 3. Ghi hóa đơn + TRỪ KHO trong một transaction (hỏng bước nào thì hủy hết). Khóa nối tiếp để so_thu_tu
  //    (reset mỗi ngày) không bị trùng khi nhiều order tạo cùng lúc. Khuyến mãi: giam_gia = 0, ma_khuyen_mai = NULL đến Sprint 3.
  const ketQua = await withTransaction(async conn => {
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
    const { canh_bao_kho } = await khoService.truKho(sangDongNhuCau(items), conn);
    return { hoaDon: await repo.layHoaDon(ma, conn), canh_bao_kho };
  }, { khoa: KHOA_SO_THU_TU });
  return { ...dinhDang(ketQua.hoaDon), canh_bao_kho: ketQua.canh_bao_kho };
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

// thucHien có thể trả { canh_bao_kho } (khi vừa trừ kho); khi đó phản hồi kèm canh_bao_kho.
function trongOrder(ma, thucHien) {
  return withTransaction(async conn => {
    const hd = await khoaOrderDangMo(ma, conn);
    const kq = await thucHien(conn, hd);
    const hoaDon = dinhDang(await repo.layHoaDon(ma, conn));
    return kq && kq.canh_bao_kho ? { ...hoaDon, canh_bao_kho: kq.canh_bao_kho } : hoaDon;
  });
}

const sangDongNhuCau = dongs => dongs.map(d => ({ ma_san_pham: d.ma_san_pham, so_luong: d.so_luong }));

// Gọi thêm ly khi order đã phục vụ: có món mới cần làm nên quay lại "đang pha chế" (nhờ vậy lúc hủy, nhân viên được chọn ly nào đã làm)
async function veDangPhaCheNeuDaPhucVu(ma, hd, conn) {
  if (hd.trang_thai === 'da_phuc_vu') await repo.doiTrangThai(ma, 'dang_pha_che', conn);
}

// Bỏ ly: dongBo = [{ ma_san_pham, so_luong_bo, so_luong_da_lam }]. Chỉ ly CHƯA làm được trả lại kho.
// Order đã phục vụ coi như làm xong hết: không trả gì.
async function xuLyKhoKhiBo(trangThai, dongBo, conn) {
  if (trangThai === 'da_phuc_vu') return;
  const tra = dongBo
    .map(d => ({ ma_san_pham: d.ma_san_pham, so_luong: d.so_luong_bo - d.so_luong_da_lam }))
    .filter(d => d.so_luong > 0);
  if (tra.length) await khoService.traKho(tra, conn);
}

// da_lam của POS-07/09: [{ ma_chi_tiet, so_luong }] -> Map(ma_chi_tiet -> số ly đã làm); kiểm tra thuộc hóa đơn, không lặp, không vượt số ly đã gọi
function chuanHoaDaLam(daLam, dongs) {
  const theoDong = new Map(dongs.map(d => [d.ma_chi_tiet, d]));
  const kq = new Map();
  for (const m of daLam || []) {
    const dong = theoDong.get(m.ma_chi_tiet);
    if (!dong) throw loi.duLieuSai(`ma_chi_tiet ${m.ma_chi_tiet} không thuộc hóa đơn này`);
    if (kq.has(m.ma_chi_tiet)) throw loi.duLieuSai(`ma_chi_tiet ${m.ma_chi_tiet} bị lặp trong da_lam`);
    if (m.so_luong > dong.so_luong) throw loi.duLieuSai(`da_lam của dòng ${m.ma_chi_tiet} (${m.so_luong}) lớn hơn số ly đã gọi (${dong.so_luong})`);
    kq.set(m.ma_chi_tiet, m.so_luong);
  }
  return kq;
}

// POS-03: luôn thêm DÒNG MỚI (cùng sản phẩm, ghi chú khác là hai dòng). Trừ kho ngay phần ly mới thêm.
function themDong(ma, { ma_san_pham, so_luong, ghi_chu }) {
  return trongOrder(ma, async (conn, hd) => {
    const [sp] = await sanPhamService.layNhieuSanPham([ma_san_pham], conn);
    if (!sp) throw loi.khongTimThay(`Không tìm thấy sản phẩm: ${ma_san_pham}`);
    if (sp.trang_thai !== 'con_ban') {
      throw loi.yeuCauSai('SAN_PHAM_NGUNG_BAN', `Sản phẩm đã ngừng bán: ${sp.ten_san_pham}`, [{ ma_san_pham: sp.ma_san_pham, ten_san_pham: sp.ten_san_pham }]);
    }
    const { canh_bao_kho } = await khoService.truKho([{ ma_san_pham, so_luong }], conn);
    await repo.themChiTiet(ma, [{ ma_san_pham, ma_khuyen_mai: null, so_luong, don_gia: sp.gia_ban, giam_gia: 0, ghi_chu }], conn);
    await veDangPhaCheNeuDaPhucVu(ma, hd, conn);
    return { canh_bao_kho };
  });
}

// POS-04: đổi số lượng giữ nguyên mức giảm trên mỗi ly (giam_gia tính lại theo tỷ lệ; Sprint 3 sẽ tính từ khuyến mãi).
//  - TĂNG: trừ kho phần chênh (thiếu thì 409, không đổi gì).
//  - GIẢM: trả lại kho phần ly bị bỏ trừ `da_lam` (số ly trong phần bị bỏ đã làm xong; mặc định 0).
function suaDong(ma, maChiTiet, { so_luong, ghi_chu, da_lam }) {
  return trongOrder(ma, async (conn, hd) => {
    const dong = await repo.timDong(maChiTiet, ma, conn);
    if (!dong) throw loi.khongTimThay('Không tìm thấy dòng món trong hóa đơn');
    const doiSoLuong = so_luong !== undefined && so_luong !== dong.so_luong;
    const giamSoLuong = doiSoLuong && so_luong < dong.so_luong;
    if (da_lam !== undefined && !giamSoLuong) throw loi.duLieuSai('da_lam chỉ dùng khi giảm số lượng');

    const capNhat = {};
    if (ghi_chu !== undefined) capNhat.ghi_chu = ghi_chu || null;
    let ketQua;
    if (doiSoLuong) {
      capNhat.so_luong = so_luong;
      capNhat.giam_gia = lamTronTien((dong.giam_gia / dong.so_luong) * so_luong);
      if (!giamSoLuong) {
        ketQua = await khoService.truKho([{ ma_san_pham: dong.ma_san_pham, so_luong: so_luong - dong.so_luong }], conn);
        await veDangPhaCheNeuDaPhucVu(ma, hd, conn);
      } else {
        const bo = dong.so_luong - so_luong;
        const daLam = da_lam ?? 0;
        if (daLam > bo) throw loi.duLieuSai(`da_lam (${daLam}) không được lớn hơn số ly bị bỏ (${bo})`);
        await xuLyKhoKhiBo(hd.trang_thai, [{ ma_san_pham: dong.ma_san_pham, so_luong_bo: bo, so_luong_da_lam: daLam }], conn);
      }
    }
    if (Object.keys(capNhat).length) await repo.suaDong(maChiTiet, capNhat, conn);
    return ketQua;
  });
}

// POS-05: xóa cả dòng; da_lam = số ly của dòng đã làm xong (mặc định 0). Không xóa dòng cuối cùng (phải hủy order).
function xoaDong(ma, maChiTiet, { da_lam } = {}) {
  return trongOrder(ma, async (conn, hd) => {
    const tatCa = await repo.layDongCuaHoaDon(ma, conn);
    const dong = tatCa.find(d => d.ma_chi_tiet === maChiTiet);
    if (!dong) throw loi.khongTimThay('Không tìm thấy dòng món trong hóa đơn');
    if (tatCa.length === 1) {
      throw loi.xungDot('KHONG_XOA_DONG_CUOI', 'Order chỉ còn một dòng; hãy hủy order thay vì xóa dòng cuối');
    }
    const daLam = da_lam ?? 0;
    if (daLam > dong.so_luong) throw loi.duLieuSai(`da_lam (${daLam}) không được lớn hơn số ly của dòng (${dong.so_luong})`);
    await xuLyKhoKhiBo(hd.trang_thai, [{ ma_san_pham: dong.ma_san_pham, so_luong_bo: dong.so_luong, so_luong_da_lam: daLam }], conn);
    await repo.xoaDong(maChiTiet, conn);
  });
}

// POS-07: dang_pha_che -> da_phuc_vu; dang_pha_che/da_phuc_vu -> huy. Thanh toán dùng POS-08. Hóa đơn đã đóng không đổi được.
// Hủy: ly chưa làm được trả lại kho; `da_lam` = [{ ma_chi_tiet, so_luong }] cho biết số ly mỗi dòng đã làm (dòng không nêu = chưa làm).
function doiTrangThai(ma, trangThaiMoi, daLam) {
  return trongOrder(ma, async (conn, hd) => {
    if (daLam !== undefined && trangThaiMoi !== 'huy') throw loi.duLieuSai('da_lam chỉ dùng khi hủy order');
    if (trangThaiMoi === 'da_thanh_toan') {
      throw loi.xungDot('CHUYEN_TRANG_THAI_KHONG_HOP_LE', 'Chuyển sang đã thanh toán bằng chức năng thanh toán, không dùng đổi trạng thái');
    }
    if (!(CHUYEN_HOP_LE[hd.trang_thai] || []).includes(trangThaiMoi)) {
      throw loi.xungDot('CHUYEN_TRANG_THAI_KHONG_HOP_LE', `Không thể chuyển từ ${hd.trang_thai} sang ${trangThaiMoi}`);
    }
    if (trangThaiMoi === 'huy') {
      const dongs = await repo.layDongCuaHoaDon(ma, conn);
      const daLamTheoDong = chuanHoaDaLam(daLam, dongs);
      await xuLyKhoKhiBo(hd.trang_thai, dongs.map(d => ({
        ma_san_pham: d.ma_san_pham, so_luong_bo: d.so_luong, so_luong_da_lam: daLamTheoDong.get(d.ma_chi_tiet) ?? 0,
      })), conn);
    }
    await repo.doiTrangThai(ma, trangThaiMoi, conn);
  });
}

// POS-09: hủy order = chuyển sang huy (cùng luật kho như trên).
const huy = (ma, daLam) => doiTrangThai(ma, 'huy', daLam);

// POS-08: thanh toán, TẤT CẢ trong một transaction (một bước lỗi thì hủy hết, không để tiền/điểm lệch nhau).
// KHÔNG đụng kho: nguyên liệu đã được trừ từ lúc gọi món. Thứ tự khóa: HoaDon -> KhachHang.
//  1. khóa hóa đơn, kiểm tra còn mở (đã thanh toán/đã hủy: 409)  2. chốt tổng tiền từ các dòng
//  3. ghi trạng thái da_thanh_toan  4. cộng điểm cho khách thành viên
function thanhToan(ma, { phuong_thuc_thanh_toan }) {
  return withTransaction(async conn => {
    await khoaOrderDangMo(ma, conn);

    const dongs = await repo.layDongCuaHoaDon(ma, conn);
    const tong = lamTronTien(dongs.reduce((s, d) => s + d.so_luong * d.don_gia - d.giam_gia, 0));
    if (tong < 0) throw loi.xungDot('TONG_TIEN_KHONG_HOP_LE', 'Tổng tiền hóa đơn bị âm (mức giảm lớn hơn tiền hàng)');

    // Lấy thông tin hóa đơn sớm để kiểm tra khách hàng và tính số điểm cộng
    let hoaDon = await repo.layHoaDon(ma, conn);
    const coKhach = hoaDon.ma_khach_hang !== null;
    const diemCong = coKhach ? Math.floor(tong / DIEM_MOI_VND) : 0;

    // Truyền thêm diemCong vào tham số thứ 4 của chotThanhToan (trước tham số conn)
    if ((await repo.chotThanhToan(ma, phuong_thuc_thanh_toan, tong, diemCong, conn)) !== 1) {
      throw loi.xungDot('HOA_DON_DA_DONG', 'Hóa đơn đã thanh toán, không thay đổi được');
    }

    // Lấy lại hóa đơn một lần nữa để lấy trạng thái mới nhất ('da_thanh_toan') trả về cho client
    hoaDon = await repo.layHoaDon(ma, conn);

    // Cộng điểm cho khách hàng sau khi bảng HoaDonDaThanhToan đã được ghi thành công
    const diemHienTai = coKhach ? await khachHangService.congDiem(hoaDon.ma_khach_hang, diemCong, conn) : null;

    return { hoa_don: dinhDang(hoaDon), diem_cong: diemCong, diem_hien_tai: diemHienTai };
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
