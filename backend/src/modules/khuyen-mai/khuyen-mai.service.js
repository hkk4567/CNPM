// khuyen-mai – nghiệp vụ 7a: KM-01 tạo, KM-02 sửa, KM-03 xóa, KM-04/05 gán/gỡ sản phẩm, KM-06 danh sách (+ xem chi tiết).
// 7b: tinhKhuyenMai (áp tự động vào menu/order, dùng bởi san-pham và hoa-don), baoCaoHieuQua (KM-07). Module khác chỉ gọi qua service.
// Mọi thao tác ghi chạy trong transaction và KHÓA dòng khuyến mãi trước.
// Quy tắc: một sản phẩm có thể thuộc NHIỀU khuyến mãi cùng lúc (cộng dồn khi áp, xem 7b). Sửa/xóa không ảnh hưởng hóa đơn cũ vì mức giảm
// đã được snapshot ở ChiTietHoaDonKhuyenMai / ChiTietHoaDon.giam_gia.
const repo = require('./khuyen-mai.repository');
const { loi } = require('../../utils/loi-nghiep-vu');
const { withTransaction } = require('../../utils/transaction');
const { thongBaoPhanTram, thongBaoNgay } = require('./khuyen-mai.schema');

const ERR_DANG_DUNG = 1451; // khóa ngoại đang được tham chiếu

const loiKhongCo = () => loi.khongTimThay('Không tìm thấy khuyến mãi');
const loiDaDung = () => loi.xungDot('KHUYEN_MAI_DA_DUOC_DUNG',
  'Khuyến mãi đã được áp trong hóa đơn nên không xóa được; hãy đặt ngay_ket_thuc về thời điểm hiện tại để ngừng áp dụng (PATCH ngay_ket_thuc)');

// Tránh vòng phụ thuộc: san-pham.service (menu) gọi khuyen-mai.service để tính giá giảm, nên ở đây chỉ nạp san-pham.service khi cần
const sanPhamService = () => require('../san-pham/san-pham.service');

// Kiểm tra các sản phẩm đều tồn tại (ngừng bán vẫn được gán). Thiếu: 404 kèm danh sách mã thiếu.
async function kiemTraSanPhamTonTai(dsMa, conn) {
  if (!dsMa.length) return;
  const co = new Set((await sanPhamService().layNhieuSanPham(dsMa, conn)).map(s => s.ma_san_pham));
  const thieu = dsMa.filter(m => !co.has(m));
  if (thieu.length) throw loi.khongTimThay(`Không tìm thấy sản phẩm: ${thieu.join(', ')}`);
}

// Quy tắc giá trị/ngày trên dữ liệu ĐẦY ĐỦ (dùng cho KM-02 sau khi gộp với dữ liệu cũ)
function kiemTraDayDu(d) {
  const chiTiet = [];
  if (d.loai_giam === 'phan_tram' && d.gia_tri_giam > 100) chiTiet.push({ noi: 'body', truong: 'gia_tri_giam', thong_bao: thongBaoPhanTram });
  if (!(d.ngay_bat_dau < d.ngay_ket_thuc)) chiTiet.push({ noi: 'body', truong: 'ngay_bat_dau', thong_bao: thongBaoNgay });
  if (chiTiet.length) throw loi.duLieuSai(undefined, chiTiet);
}

async function chiTietDayDu(ma, conn) {
  const km = await repo.timTheoMa(ma, conn);
  return { ...km, san_pham: await repo.layDanhSachSanPham(ma, conn) };
}

// KM-01
function taoKhuyenMai({ ma_san_pham, ...d }) {
  const dsMa = [...new Set(ma_san_pham || [])];
  return withTransaction(async conn => {
    await kiemTraSanPhamTonTai(dsMa, conn);
    const ma = await repo.tao(d, conn);
    await repo.themSanPham(ma, dsMa, conn);
    return chiTietDayDu(ma, conn);
  });
}

// KM-02: không đổi hóa đơn cũ; order đang mở cũng giữ mức giảm đã chụp
function suaKhuyenMai(ma, d) {
  return withTransaction(async conn => {
    const cu = await repo.khoa(ma, conn);
    if (!cu) throw loiKhongCo();
    kiemTraDayDu({ ...cu, ...d });
    await repo.sua(ma, d, conn);
    return chiTietDayDu(ma, conn);
  });
}

// KM-03: đã được dùng thì chặn (409), gợi ý đặt ngay_ket_thuc về hiện tại
async function xoaKhuyenMai(ma) {
  try {
    return await withTransaction(async conn => {
      if (!(await repo.khoa(ma, conn))) throw loiKhongCo();
      if (await repo.daDuocDung(ma, conn)) throw loiDaDung();
      await repo.xoa(ma, conn);
      return { da_xoa: true };
    });
  } catch (e) {
    throw e.errno === ERR_DANG_DUNG ? loiDaDung() : e; // có order chen vào giữa lúc đang xóa
  }
}

// KM-04: trả danh sách sản phẩm hiện tại của khuyến mãi
function themSanPham(ma, { ma_san_pham }) {
  const dsMa = [...new Set(ma_san_pham)];
  return withTransaction(async conn => {
    if (!(await repo.khoa(ma, conn))) throw loiKhongCo();
    await kiemTraSanPhamTonTai(dsMa, conn);
    await repo.themSanPham(ma, dsMa, conn);
    return repo.layDanhSachSanPham(ma, conn);
  });
}

// KM-05: sản phẩm không thuộc khuyến mãi: 404
function goSanPham(ma, maSanPham) {
  return withTransaction(async conn => {
    if (!(await repo.khoa(ma, conn))) throw loiKhongCo();
    if ((await repo.goSanPham(ma, maSanPham, conn)) === 0) throw loi.khongTimThay('Sản phẩm không thuộc khuyến mãi này');
    return repo.layDanhSachSanPham(ma, conn);
  });
}

// KM-06
const layDanhSach = (query, phanTrang) => repo.danhSach(query, phanTrang);

async function layChiTiet(ma) {
  const km = await repo.timTheoMa(ma);
  if (!km) throw loiKhongCo();
  return { ...km, san_pham: await repo.layDanhSachSanPham(ma) };
}

// ---------- 7b: tự động áp khuyến mãi ----------
// Quy tắc (người dùng chốt): MỘT SẢN PHẨM ÁP NHIỀU KHUYẾN MÃI cùng lúc, CỘNG DỒN trên GIÁ GỐC; tính TRÊN TỪNG LY.
//  - Mức giảm mỗi ly của một mã: phan_tram = giá gốc x % / 100; so_tien = gia_tri_giam; làm tròn XUỐNG đồng nguyên.
//  - Áp lần lượt theo mã khuyến mãi tăng dần; tổng giảm mỗi ly không vượt giá bán (mã nào chỉ còn phần dư thì được cắt bớt,
//    mã không còn gì để giảm thì không ghi). Mức giảm mỗi mã được chụp lại (snapshot) vào ChiTietHoaDonKhuyenMai khi gọi món.
function mucGiamMoiLy(km, giaBan) {
  const tho = km.loai_giam === 'phan_tram' ? (giaBan * Number(km.gia_tri_giam)) / 100 : Number(km.gia_tri_giam);
  return Math.floor(tho + 1e-9);
}

// sanPhams: [{ ma_san_pham, gia_ban }] (gia_ban = giá dùng để tính, vd. don_gia đã chụp). Trả Map(ma_san_pham ->
// { gia_ban, tong_giam_moi_ly, gia_sau_giam, khuyen_mai: [{ ma_khuyen_mai, ten_khuyen_mai, muc_giam_moi_ly }] }).
// khoa = true khi gọi trong transaction ghi hóa đơn (xem repository.layDangHieuLuc).
async function tinhKhuyenMai(sanPhams, { conn, khoa = false } = {}) {
  const dsMa = [...new Set(sanPhams.map(s => s.ma_san_pham))];
  const dangChay = await repo.layDangHieuLuc(dsMa, { conn, khoa });
  const ketQua = new Map();
  for (const sp of sanPhams) {
    if (ketQua.has(sp.ma_san_pham)) continue;
    const giaBan = Number(sp.gia_ban);
    let conLai = giaBan;
    const khuyenMai = [];
    for (const km of dangChay.filter(k => k.ma_san_pham === sp.ma_san_pham)) {
      const muc = Math.min(mucGiamMoiLy(km, giaBan), conLai);
      if (muc <= 0) continue;
      khuyenMai.push({ ma_khuyen_mai: km.ma_khuyen_mai, ten_khuyen_mai: km.ten_khuyen_mai, muc_giam_moi_ly: muc });
      conLai -= muc;
    }
    ketQua.set(sp.ma_san_pham, { gia_ban: giaBan, tong_giam_moi_ly: giaBan - conLai, gia_sau_giam: conLai, khuyen_mai: khuyenMai });
  }
  return ketQua;
}

// KM-07
async function baoCaoHieuQua(ma, loc) {
  const km = await repo.timTheoMa(ma);
  if (!km) throw loiKhongCo();
  const so = await repo.baoCaoHieuQua(ma, loc);
  return {
    ma_khuyen_mai: km.ma_khuyen_mai, ten_khuyen_mai: km.ten_khuyen_mai,
    tu_ngay: loc.tu_ngay ?? null, den_ngay: loc.den_ngay ?? null,
    ...so,
  };
}

module.exports = { tinhKhuyenMai, mucGiamMoiLy, baoCaoHieuQua, taoKhuyenMai, suaKhuyenMai, xoaKhuyenMai, themSanPham, goSanPham, layDanhSach, layChiTiet };
