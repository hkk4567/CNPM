// Gọi API module san-pham (SP-01..SP-05, menu) và công thức (kho: KHO-03)
import { http } from './http.js';

// SP-01 danh mục
export const dsDanhMuc = () => http.get('/danh-muc');
export const taoDanhMuc = ten_danh_muc => http.post('/danh-muc', { ten_danh_muc });
export const suaDanhMuc = (ma, ten_danh_muc) => http.put(`/danh-muc/${ma}`, { ten_danh_muc });
export const xoaDanhMuc = ma => http.xoa(`/danh-muc/${ma}`);

// SP-05 danh sách (admin/quản lý) – có phân trang; bộ lọc: ma_danh_muc, tu_khoa, trang_thai, trang, moi_trang
export const dsSanPham = loc => http.danhSach('/san-pham', loc);
// POS-01 menu: chỉ sản phẩm đang bán, kèm khuyen_mai[] và so_ly_toi_da (null = chưa có công thức)
export const menu = () => http.get('/san-pham/menu');
export const taoSanPham = d => http.post('/san-pham', d);              // SP-02
export const suaSanPham = (ma, d) => http.patch(`/san-pham/${ma}`, d); // SP-03
export const xoaSanPham = ma => http.xoa(`/san-pham/${ma}`);          // SP-04

// Công thức (route nằm ở module kho)
export const xemCongThuc = ma => http.get(`/kho/cong-thuc/${ma}`);
export const datCongThuc = (ma, nguyen_lieu) => http.put(`/kho/cong-thuc/${ma}`, { nguyen_lieu });
export const dsNguyenLieu = () => http.danhSach('/kho/nguyen-lieu', { moi_trang: 100 });
