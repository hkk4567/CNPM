// KH-01 tạo khách, KH-03 tìm khách (nhân viên được dùng cả hai; sửa / lịch sử mua chỉ quản lý & admin).
import { http } from './http';

export type KhachHang = { ma_khach_hang: number; ten_khach_hang: string; so_dien_thoai: string; diem_tich_luy: number };
export const SDT_HOP_LE = /^0\d{9}$/; // 10 chữ số, bắt đầu bằng 0 (khớp backend)

// tu_khoa: một phần tên hoặc số điện thoại; máy chủ trả tối đa 20 khách
export const timKhach = (tu_khoa: string) => http.get<KhachHang[]>('/khach-hang', { tu_khoa });
export const taoKhach = (ten_khach_hang: string, so_dien_thoai: string) => http.post<KhachHang>('/khach-hang', { ten_khach_hang, so_dien_thoai });
