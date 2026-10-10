// san-pham – nghiệp vụ: danh mục (SP-01), sản phẩm (SP-02..SP-05), menu (POS-01).
const repo = require('./san-pham.repository');
const khuyenMaiService = require('../khuyen-mai/khuyen-mai.service');
const { loi } = require('../../utils/loi-nghiep-vu');
const { withTransaction } = require('../../utils/transaction');

const ERR_TRUNG = 1062;      // UNIQUE bị vi phạm
const ERR_DANG_DUNG = 1451;  // khóa ngoại đang được tham chiếu

const loiDanhMucKhongCo = () => loi.khongTimThay('Không tìm thấy danh mục');
const loiSanPhamKhongCo = () => loi.khongTimThay('Không tìm thấy sản phẩm');
const loiTrungTen = () => loi.xungDot('TRUNG_TEN_DANH_MUC', 'Tên danh mục đã tồn tại');

// ---------- Danh mục ----------
const dsDanhMuc = () => repo.dsDanhMuc();

async function taoDanhMuc({ ten_danh_muc }) {
  try {
    const ma = await repo.taoDanhMuc(ten_danh_muc);
    return await repo.timDanhMuc(ma);
  } catch (e) {
    throw e.errno === ERR_TRUNG ? loiTrungTen() : e;
  }
}

async function suaDanhMuc(ma, { ten_danh_muc }) {
  if (!(await repo.timDanhMuc(ma))) throw loiDanhMucKhongCo();
  try {
    await repo.suaDanhMuc(ma, ten_danh_muc);
  } catch (e) {
    throw e.errno === ERR_TRUNG ? loiTrungTen() : e;
  }
  return repo.timDanhMuc(ma);
}

async function xoaDanhMuc(ma) {
  if (!(await repo.timDanhMuc(ma))) throw loiDanhMucKhongCo();
  if ((await repo.demSanPhamTrongDanhMuc(ma)) > 0) {
    throw loi.xungDot('DANH_MUC_DANG_DUNG', 'Danh mục còn sản phẩm nên không xóa được');
  }
  await repo.xoaDanhMuc(ma);
  return { da_xoa: true };
}

// ---------- Sản phẩm ----------
async function layMenu(query) {
  const rows = await repo.menu(query);
  // 7b: giá sau giảm = giá gốc trừ mọi khuyến mãi đang hiệu lực (cộng dồn); khuyen_mai[] liệt kê từng mã và mức giảm mỗi ly
  const gia = await khuyenMaiService.tinhKhuyenMai(rows);
  return rows.map(r => {
    const soLy = r.so_ly_toi_da === null ? null : Number(r.so_ly_toi_da);
    const g = gia.get(r.ma_san_pham);
    return {
      ...r, so_ly_toi_da: soLy, du_nguyen_lieu: soLy === null || soLy >= 1,
      gia_sau_giam: g.gia_sau_giam, tong_giam_moi_ly: g.tong_giam_moi_ly, khuyen_mai: g.khuyen_mai,
    };
  });
}

async function layDanhSach(query, phanTrang) {
  return repo.danhSach(query, phanTrang);
}

// Cho module khác (hoa-don) dùng: trả danh sách sản phẩm theo mã (không báo lỗi nếu thiếu, bên gọi tự kiểm tra)
const layNhieuSanPham = (dsMa, conn) => repo.timNhieuSanPham(dsMa, conn);

async function layChiTiet(ma) {
  const sp = await repo.timSanPham(ma);
  if (!sp) throw loiSanPhamKhongCo();
  return sp;
}

async function taoSanPham(d) {
  if (!(await repo.timDanhMuc(d.ma_danh_muc))) throw loiDanhMucKhongCo();
  return repo.timSanPham(await repo.taoSanPham(d));
}

async function suaSanPham(ma, d) {
  if (!(await repo.timSanPham(ma))) throw loiSanPhamKhongCo();
  if (d.ma_danh_muc !== undefined && !(await repo.timDanhMuc(d.ma_danh_muc))) throw loiDanhMucKhongCo();
  await repo.suaSanPham(ma, d);
  return repo.timSanPham(ma);
}

// Xóa kèm công thức và liên kết khuyến mãi trong một transaction; sản phẩm đã bán thì chỉ được ngừng bán
async function xoaSanPham(ma) {
  const daBan = () => loi.xungDot('SAN_PHAM_DA_BAN', 'Sản phẩm đã được bán trong hóa đơn nên không xóa được; hãy chuyển sang ngừng bán (trang_thai = ngung_ban)');
  try {
    return await withTransaction(async conn => {
      if (!(await repo.khoaSanPham(ma, conn))) throw loiSanPhamKhongCo();
      if ((await repo.demChiTietHoaDon(ma, conn)) > 0) throw daBan();
      await repo.xoaCongThuc(ma, conn);
      await repo.xoaLienKetKhuyenMai(ma, conn);
      await repo.xoaSanPham(ma, conn);
      return { da_xoa: true };
    });
  } catch (e) {
    throw e.errno === ERR_DANG_DUNG ? daBan() : e; // có order chen vào giữa lúc đang xóa
  }
}

module.exports = {
  dsDanhMuc, taoDanhMuc, suaDanhMuc, xoaDanhMuc,
  layMenu, layDanhSach, layNhieuSanPham, layChiTiet, taoSanPham, suaSanPham, xoaSanPham,
};
