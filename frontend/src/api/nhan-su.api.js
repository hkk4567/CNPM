// Gọi API module nhan-su (NS-01..NS-07). Danh sách nhân viên: http.danhSach trả { data, tong_so_ban_ghi, trang, moi_trang }.
import { http } from './http.js';

export const dsNhanVien = loc => http.danhSach('/nhan-su', loc);               // loc: tu_khoa, trang_thai, quyen_truy_cap, trang, moi_trang
export const taoNhanVien = d => http.post('/nhan-su', d);                       // NS-01 (chỉ admin): tạo nhân viên + tài khoản
export const suaNhanVien = (ma, d) => http.patch(`/nhan-su/${ma}`, d);          // NS-02: ho_ten, chuc_vu, so_dien_thoai; admin thêm quyen_truy_cap, mat_khau
export const xoaNhanVien = ma => http.xoa(`/nhan-su/${ma}`);                    // NS-03 (chỉ admin): { da_xoa } (false = đã cho nghỉ việc)

export const dsCa = () => http.get('/nhan-su/ca-lam-viec');                     // NS-04 (kèm so_phan_cong)
export const taoCa = d => http.post('/nhan-su/ca-lam-viec', d);
export const suaCa = (ma, d) => http.patch(`/nhan-su/ca-lam-viec/${ma}`, d);
export const xoaCa = ma => http.xoa(`/nhan-su/ca-lam-viec/${ma}`);

export const xepLich = d => http.post('/nhan-su/phan-cong', d);                 // NS-05: { ma_nhan_vien, ma_ca, ngay_lam: 'YYYY-MM-DD' | [..] }
export const goPhanCong = ({ ma_nhan_vien, ma_ca, ngay_lam }) =>               // NS-06
  http.xoa(`/nhan-su/phan-cong?${new URLSearchParams({ ma_nhan_vien, ma_ca, ngay_lam })}`);
export const lichTuan = loc => http.danhSach('/nhan-su/lich-tuan', loc);       // NS-07: loc.tu_ngay (thứ Hai), ma_nhan_vien; trả thêm tu_ngay, den_ngay
