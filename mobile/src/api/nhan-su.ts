// NS-07: lịch làm việc theo tuần. Nhân viên chỉ xem được lịch của chính mình (backend trả 403 nếu xin người khác).
import { http } from './http';

export type PhanCong = {
  ngay_lam: string; ma_ca: number; ten_ca: string; thoi_gian_bat_dau: string; thoi_gian_ket_thuc: string; ma_nhan_vien: number; ho_ten: string;
};
export type LichTuan = { data: PhanCong[]; tu_ngay: string; den_ngay: string };

// tu_ngay phải là thứ Hai (YYYY-MM-DD)
export const lichTuan = (tu_ngay: string, ma_nhan_vien: number) => http.danhSach<LichTuan>('/nhan-su/lich-tuan', { tu_ngay, ma_nhan_vien });
