// Gọi API module kho: nguyên liệu (KHO-01), nhà cung cấp (KHO-02), phiếu nhập (KHO-04, KHO-05), tồn kho (KHO-06).
// Công thức (KHO-03) dùng trong san-pham.api.js vì sửa ngay trong màn Sản phẩm.
import { http } from './http.js';

// KHO-06: không phân trang. loc: { chi_sap_het: 'true', tu_khoa }
export const dsTonKho = loc => http.get('/kho/ton-kho', loc);

// KHO-01
export const dsNguyenLieu = loc => http.danhSach('/kho/nguyen-lieu', loc);
export const taoNguyenLieu = d => http.post('/kho/nguyen-lieu', d);
export const suaNguyenLieu = (ma, d) => http.patch(`/kho/nguyen-lieu/${ma}`, d);
export const xoaNguyenLieu = ma => http.xoa(`/kho/nguyen-lieu/${ma}`);

// KHO-02
export const dsNcc = loc => http.danhSach('/kho/nha-cung-cap', loc);
export const taoNcc = d => http.post('/kho/nha-cung-cap', d);
export const suaNcc = (ma, d) => http.patch(`/kho/nha-cung-cap/${ma}`, d);
export const xoaNcc = ma => http.xoa(`/kho/nha-cung-cap/${ma}`);

// KHO-04, KHO-05. Lịch sử trả thêm tong_tien_nhap (tính trên toàn bộ kết quả lọc)
export const taoPhieuNhap = d => http.post('/kho/phieu-nhap', d);
export const dsPhieuNhap = loc => http.danhSach('/kho/phieu-nhap', loc);
export const chiTietPhieuNhap = ma => http.get(`/kho/phieu-nhap/${ma}`);
