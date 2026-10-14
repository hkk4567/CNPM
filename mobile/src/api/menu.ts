// POS-01: menu (món đang bán, kèm số ly tối đa theo tồn kho và giá sau khuyến mãi).
import { http } from './http';

export type MonMenu = {
  ma_san_pham: number; ma_danh_muc: number; ten_danh_muc: string; ten_san_pham: string;
  gia_ban: number; gia_sau_giam: number; tong_giam_moi_ly: number;
  so_ly_toi_da: number | null; // null = chưa có công thức = không giới hạn
  du_nguyen_lieu: boolean;
  khuyen_mai: { ma_khuyen_mai: number; ten_khuyen_mai: string; muc_giam_moi_ly: number }[];
};
export const layMenu = () => http.get<MonMenu[]>('/san-pham/menu');
