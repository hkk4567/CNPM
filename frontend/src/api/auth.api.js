// Gọi API module auth (AUTH-01, AUTH-02)
import { http } from './http.js';

export const dangNhap = (ten_dang_nhap, mat_khau) => http.post('/auth/dang-nhap', { ten_dang_nhap, mat_khau });
export const toi = () => http.get('/auth/toi');
export const doiMatKhau = (mat_khau_cu, mat_khau_moi) => http.post('/auth/doi-mat-khau', { mat_khau_cu, mat_khau_moi });
