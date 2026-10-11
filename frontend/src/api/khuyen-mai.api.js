// Gọi API module khuyen-mai (KM-01..KM-07). Ngày giờ gửi lên ở dạng ISO có múi giờ (toISOString) để không lệch giờ.
import { http } from './http.js';

export const dsKhuyenMai = loc => http.danhSach('/khuyen-mai', loc);   // KM-06; loc: trang_thai, ma_san_pham, trang, moi_trang
export const chiTietKhuyenMai = ma => http.get(`/khuyen-mai/${ma}`);   // kèm san_pham[]
export const taoKhuyenMai = d => http.post('/khuyen-mai', d);          // KM-01 (d.ma_san_pham[] tùy chọn)
export const suaKhuyenMai = (ma, d) => http.patch(`/khuyen-mai/${ma}`, d); // KM-02
export const xoaKhuyenMai = ma => http.xoa(`/khuyen-mai/${ma}`);       // KM-03
export const themSanPhamKm = (ma, ma_san_pham) => http.post(`/khuyen-mai/${ma}/san-pham`, { ma_san_pham }); // KM-04
export const goSanPhamKm = (ma, maSanPham) => http.xoa(`/khuyen-mai/${ma}/san-pham/${maSanPham}`);          // KM-05
export const baoCaoKhuyenMai = (ma, loc) => http.get(`/khuyen-mai/${ma}/bao-cao`, loc);                      // KM-07
