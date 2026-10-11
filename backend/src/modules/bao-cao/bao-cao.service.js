// bao-cao – nghiệp vụ báo cáo (chỉ đọc). Tiền tính tròn 2 chữ số thập phân để tránh sai số số thực khi cộng/trừ.
const repo = require('./bao-cao.repository');

const lamTron2 = x => Math.round((x + Number.EPSILON) * 100) / 100;

const doanhThuTheoThoiGian = ({ nhom = 'ngay', ...loc }) => repo.doanhThuTheoKy(loc, nhom);
const sanPhamBanChay = ({ top = 10, ...loc }) => repo.sanPhamBanChay(loc, top);
async function doanhThuTheoDanhMuc(loc) {
  const rows = await repo.doanhThuTheoDanhMuc(loc);
  const tong = rows.reduce((t, r) => t + r.doanh_thu, 0);
  return rows.map(r => ({ ...r, ty_le: tong > 0 ? lamTron2((r.doanh_thu / tong) * 100) : 0 })); // ty_le: phần trăm trên tổng doanh thu theo danh mục
}
const theoPhuongThuc = loc => repo.theoPhuongThuc(loc);
const theoNhanVien = loc => repo.theoNhanVien(loc);

// BC-05: gộp doanh thu và chi phí nhập theo kỳ; kỳ chỉ có một phía vẫn xuất hiện (phía kia = 0). chenh_lech = doanh_thu - chi_phi_nhap.
async function chiPhiVsDoanhThu({ nhom = 'ngay', ...loc }) {
  const [dt, cp] = await Promise.all([repo.doanhThuTheoKy(loc, nhom), repo.chiPhiNhapTheoKy(loc, nhom)]);
  const map = new Map();
  for (const r of dt) map.set(r.ky, { ky: r.ky, doanh_thu: r.doanh_thu, chi_phi_nhap: 0 });
  for (const r of cp) map.set(r.ky, { ky: r.ky, doanh_thu: map.get(r.ky)?.doanh_thu ?? 0, chi_phi_nhap: r.chi_phi_nhap });
  return [...map.values()].sort((a, b) => (a.ky < b.ky ? -1 : a.ky > b.ky ? 1 : 0))
    .map(r => ({ ...r, chenh_lech: lamTron2(r.doanh_thu - r.chi_phi_nhap) }));
}

module.exports = { doanhThuTheoThoiGian, sanPhamBanChay, doanhThuTheoDanhMuc, theoPhuongThuc, chiPhiVsDoanhThu, theoNhanVien };
