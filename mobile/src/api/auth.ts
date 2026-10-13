// AUTH-01 đăng nhập, AUTH-02 đổi mật khẩu, thông tin người đang đăng nhập.
import { http } from './http';

export type Quyen = 'admin' | 'quan_ly' | 'nhan_vien';
export type NguoiDung = { ma_tai_khoan: number; ma_nhan_vien: number; ho_ten: string; quyen_truy_cap: Quyen };
export const TEN_QUYEN: Record<Quyen, string> = { admin: 'Admin', quan_ly: 'Quản lý', nhan_vien: 'Nhân viên' };

export const dangNhap = (ten_dang_nhap: string, mat_khau: string) =>
  http.post<{ token: string; nguoi_dung: NguoiDung }>('/auth/dang-nhap', { ten_dang_nhap, mat_khau });
export const toi = () => http.get<NguoiDung>('/auth/toi');
export const doiMatKhau = (mat_khau_cu: string, mat_khau_moi: string) =>
  http.post<{ da_doi: boolean }>('/auth/doi-mat-khau', { mat_khau_cu, mat_khau_moi });
