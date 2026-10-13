// Gọi API module bao-cao (BC-01..BC-06, chỉ đọc, chỉ admin/quản lý). Tham số chung: tu_ngay, den_ngay (YYYY-MM-DD, gồm cả hai đầu), tính theo NGÀY THANH TOÁN.
import { http } from './http.js';

export const doanhThu = loc => http.get('/bao-cao/doanh-thu', loc);                        // BC-01; loc.nhom: ngay | tuan | thang -> [{ ky, so_don, doanh_thu }]
export const sanPhamBanChay = loc => http.get('/bao-cao/san-pham-ban-chay', loc);          // BC-02; loc.top (1–100) -> [{ ma_san_pham, ten_san_pham, so_luong, doanh_thu }]
export const theoDanhMuc = loc => http.get('/bao-cao/doanh-thu-theo-danh-muc', loc);       // BC-03 -> [{ ma_danh_muc, ten_danh_muc, doanh_thu, ty_le }]
export const theoPhuongThuc = loc => http.get('/bao-cao/phuong-thuc-thanh-toan', loc);     // BC-04 -> [{ phuong_thuc, so_don, tong_tien }]
export const chiPhiVsDoanhThu = loc => http.get('/bao-cao/chi-phi-vs-doanh-thu', loc);     // BC-05 (kỳ chỉ có một phía vẫn có mặt) -> [{ ky, doanh_thu, chi_phi_nhap, chenh_lech }]
export const theoNhanVien = loc => http.get('/bao-cao/doanh-thu-theo-nhan-vien', loc);     // BC-06 -> [{ ma_nhan_vien, ho_ten, so_don, doanh_thu }]
