// Gọi API module khach-hang (KH-01..KH-05).
import { http } from './http.js';

export const timKhach = tu_khoa => http.get('/khach-hang', { tu_khoa });                 // KH-03: tối đa 20 kết quả
export const taoKhach = d => http.post('/khach-hang', d);                                 // KH-01: { ten_khach_hang, so_dien_thoai }
export const suaKhach = (ma, d) => http.patch(`/khach-hang/${ma}`, d);                    // KH-02: điểm không sửa được
export const lichSuMua = (ma, loc) => http.danhSach(`/khach-hang/${ma}/lich-su`, loc);    // KH-04; kèm khach_hang, tong_chi_tieu
export const topKhach = loc => http.get('/khach-hang/top', loc);                          // KH-05; loc: tu_ngay, den_ngay, top
