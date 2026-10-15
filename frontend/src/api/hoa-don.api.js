// Gọi API module hoa-don cho màn quản lý: POS-10 danh sách (mọi ngày), POS-11 chi tiết.
import { http } from './http.js';

// loc: ngay (YYYY-MM-DD), trang_thai, ma_nhan_vien, trang, moi_trang (tối đa 200). Kèm tong_so_ban_ghi.
export const dsHoaDon = loc => http.danhSach('/hoa-don', loc);
export const chiTietHoaDon = ma => http.get(`/hoa-don/${ma}`);
