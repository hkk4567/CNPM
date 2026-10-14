// POS-02..09, 10, 11: order (hóa đơn) và thanh toán.
import { http } from './http';

export type TrangThai = 'dang_pha_che' | 'da_phuc_vu' | 'da_thanh_toan' | 'huy';
export type CanhBaoKho = { ma_nguyen_lieu: number; ten_nguyen_lieu: string; don_vi_tinh: string; so_luong_ton: number; muc_ton_toi_thieu: number };
export type OrderTom = {
  ma_hoa_don: number; so_thu_tu: number; thoi_gian_tao: string; trang_thai: TrangThai; phuong_thuc_thanh_toan: string | null;
  ma_khach_hang: number | null; ten_khach_hang: string | null; ma_nhan_vien: number; ten_nhan_vien: string; so_mon: number; tong_tien: number;
};
export type DongOrder = {
  ma_chi_tiet: number; ma_san_pham: number; ten_san_pham: string; so_luong: number; don_gia: number; giam_gia: number;
  ghi_chu: string | null; thanh_tien: number;
  khuyen_mai: { ma_khuyen_mai: number; ten_khuyen_mai: string; muc_giam_moi_ly: number }[];
};
export type Order = {
  ma_hoa_don: number; so_thu_tu: number; thoi_gian_tao: string; trang_thai: TrangThai; phuong_thuc_thanh_toan: string | null;
  ma_khach_hang: number | null; ten_khach_hang: string | null; ma_nhan_vien: number; ten_nhan_vien: string;
  chi_tiet: DongOrder[]; tong_tien_hang: number; tong_giam_gia: number; tong_tien_tam_tinh: number; tong_tien: number | null;
  canh_bao_kho?: CanhBaoKho[];
};
export type DaLam = { ma_chi_tiet: number; so_luong: number }[];

export const TEN_TRANG_THAI: Record<TrangThai, string> = {
  dang_pha_che: 'Đang pha chế', da_phuc_vu: 'Đã phục vụ', da_thanh_toan: 'Đã thanh toán', huy: 'Đã hủy',
};
export const orderDangMo = (t: TrangThai) => t === 'dang_pha_che' || t === 'da_phuc_vu';

export type DongGoi = { ma_san_pham: number; so_luong: number; ghi_chu?: string | null };

export const taoOrder = (items: DongGoi[], ma_khach_hang?: number | null) => http.post<Order>('/hoa-don', { items, ma_khach_hang: ma_khach_hang ?? null });
export const danhSachOrder = (trang_thai?: TrangThai) =>
  http.danhSach<{ data: OrderTom[]; tong_so_ban_ghi: number }>('/hoa-don', { trang_thai, moi_trang: 200 });
export const chiTietOrder = (ma: number) => http.get<Order>(`/hoa-don/${ma}`);
export const themDong = (ma: number, d: DongGoi) => http.post<Order>(`/hoa-don/${ma}/dong`, d);
export const suaDong = (ma: number, maChiTiet: number, b: { so_luong?: number; ghi_chu?: string | null; da_lam?: number }) =>
  http.patch<Order>(`/hoa-don/${ma}/dong/${maChiTiet}`, b);
export const xoaDong = (ma: number, maChiTiet: number, da_lam?: number) =>
  http.xoa<Order>(`/hoa-don/${ma}/dong/${maChiTiet}${da_lam ? `?da_lam=${da_lam}` : ''}`);
export const daPhucVu = (ma: number) => http.patch<Order>(`/hoa-don/${ma}/trang-thai`, { trang_thai_moi: 'da_phuc_vu' });
export const huyOrder = (ma: number, da_lam?: DaLam) => http.post<Order>(`/hoa-don/${ma}/huy`, da_lam && da_lam.length ? { da_lam } : {});
export const ganKhach = (ma: number, so_dien_thoai: string) =>
  http.post<{ ma_khach_hang: number; ten_khach_hang: string; diem_tich_luy: number }>(`/hoa-don/${ma}/khach-hang`, { so_dien_thoai });

// POS-08: thanh toán. Máy chủ chốt tiền từ các dòng, cộng điểm cho khách đang gắn (10.000đ = 1 điểm), không đụng kho.
export type PhuongThuc = 'tien_mat' | 'chuyen_khoan' | 'vi';
export const TEN_PHUONG_THUC: Record<PhuongThuc, string> = { tien_mat: 'Tiền mặt', chuyen_khoan: 'Chuyển khoản', vi: 'Ví điện tử' };
export const DIEM_MOI_VND = 10000;
export type KetQuaThanhToan = { hoa_don: Order; diem_cong: number; diem_hien_tai: number | null };
export const thanhToan = (ma: number, phuong_thuc_thanh_toan: PhuongThuc) =>
  http.post<KetQuaThanhToan>(`/hoa-don/${ma}/thanh-toan`, { phuong_thuc_thanh_toan });
