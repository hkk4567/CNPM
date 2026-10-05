-- =====================================================================
-- seed.sql – dữ liệu mẫu (CHỈ DÙNG KHI DEV). Chạy SAU schema.sql.
-- Tài khoản mẫu:  admin / Admin@123 · quanly / Quanly@123 · nhanvien / Nhanvien@123
-- (băm bcrypt tạo bằng scripts/hash-password.js; ĐỔI mật khẩu trước khi nộp/demo thật)
-- =====================================================================
USE cafe_management;
SET NAMES utf8mb4;

INSERT INTO DanhMuc (ten_danh_muc) VALUES
 ('Cà phê'), ('Trà'), ('Sinh tố'), ('Bánh');

INSERT INTO SanPham (ma_danh_muc, ten_san_pham, gia_ban, trang_thai) VALUES
 (1, 'Cà phê đen',          25000, 'con_ban'),
 (1, 'Cà phê sữa',          29000, 'con_ban'),
 (1, 'Bạc xỉu',             32000, 'con_ban'),
 (2, 'Trà đào cam sả',      39000, 'con_ban'),
 (2, 'Trà sữa trân châu',   35000, 'con_ban'),
 (3, 'Sinh tố bơ',          42000, 'con_ban'),
 (4, 'Bánh tiramisu',       45000, 'con_ban'),
 (4, 'Croissant',           30000, 'ngung_ban');

INSERT INTO CaLamViec (ten_ca, thoi_gian_bat_dau, thoi_gian_ket_thuc) VALUES
 ('Ca sáng',  '06:00:00', '12:00:00'),
 ('Ca chiều', '12:00:00', '18:00:00'),
 ('Ca tối',   '18:00:00', '22:00:00');

INSERT INTO NhanVien (ho_ten, chuc_vu, so_dien_thoai, trang_thai) VALUES
 ('Nguyễn Văn Quản Trị', 'Quản trị hệ thống', '0900000001', 'dang_lam'),
 ('Trần Thị Quản Lý',    'Quản lý quán',      '0900000002', 'dang_lam'),
 ('Lê Văn Thu Ngân',     'Nhân viên thu ngân','0900000003', 'dang_lam'),
 ('Phạm Thị Nghỉ Việc',  'Nhân viên pha chế', '0900000004', 'nghi_viec');

INSERT INTO TaiKhoan (ma_nhan_vien, ten_dang_nhap, mat_khau_hash, quyen_truy_cap) VALUES
 (1, 'admin',    '$2b$10$VYDtUwUlcBY8c0MrzrHor.n5yQ5i1fQ.t56aI2y.QAHy7dN7G33kO', 'admin'),
 (2, 'quanly',   '$2b$10$8/ZJMNvQxoyiGDYFfrFLPu5bZ1oU6/xfVNJQtITHP.LKA49RxDl16', 'quan_ly'),
 (3, 'nhanvien', '$2b$10$4r0oK0Ki/0FafsUB8agAAe3bewynRX3Tqnv/grZtIN4yOktl.LT7O', 'nhan_vien');

INSERT INTO PhanCong (ma_nhan_vien, ma_ca, ngay_lam) VALUES
 (2, 1, CURDATE()), (3, 2, CURDATE()), (3, 3, CURDATE() + INTERVAL 1 DAY);

INSERT INTO KhachHang (ten_khach_hang, so_dien_thoai, diem_tich_luy) VALUES
 ('Nguyễn Minh Anh', '0911111111', 12),
 ('Trần Quốc Bảo',   '0922222222', 0),
 ('Lê Thu Hà',       '0933333333', 45);

INSERT INTO NhaCungCap (ten_ncc, so_dien_thoai, dia_chi) VALUES
 ('Công ty Cà phê Tây Nguyên', '0281111222', 'Buôn Ma Thuột, Đắk Lắk'),
 ('Đại lý Sữa và Nguyên liệu Sài Gòn', '0282222333', 'Quận 5, TP. Hồ Chí Minh');

INSERT INTO NguyenLieu (ten_nguyen_lieu, don_vi_tinh, so_luong_ton, muc_ton_toi_thieu) VALUES
 ('Cà phê bột', 'g',  5000, 1000),
 ('Sữa đặc',    'g',  4000, 1000),
 ('Sữa tươi',   'ml', 8000, 2000),
 ('Đường',      'g',  6000, 1500),
 ('Trà đen',    'g',  2000,  500),
 ('Trân châu',  'g',   800, 1000);   -- dưới mức tối thiểu: để thử cảnh báo KHO-06

INSERT INTO CongThuc (ma_san_pham, ma_nguyen_lieu, dinh_luong) VALUES
 (1, 1, 20), (1, 4, 10),                                   -- Cà phê đen
 (2, 1, 20), (2, 2, 30),                                   -- Cà phê sữa
 (3, 1, 15), (3, 2, 25), (3, 3, 60),                       -- Bạc xỉu
 (5, 5, 10), (5, 3, 100), (5, 4, 15), (5, 6, 50);          -- Trà sữa trân châu

-- Khuyến mãi luôn đang hiệu lực khi chạy seed (để thử POS-01/POS-02)
INSERT INTO KhuyenMai (ten_khuyen_mai, loai_giam, gia_tri_giam, ngay_bat_dau, ngay_ket_thuc) VALUES
 ('Giảm 10% cà phê',        'phan_tram', 10,    NOW() - INTERVAL 1 DAY, NOW() + INTERVAL 30 DAY),
 ('Giảm 5.000đ trà sữa',    'so_tien',   5000,  NOW() - INTERVAL 1 DAY, NOW() + INTERVAL 30 DAY),
 ('Khuyến mãi đã hết hạn',  'phan_tram', 20,    NOW() - INTERVAL 30 DAY, NOW() - INTERVAL 1 DAY);

INSERT INTO KhuyenMaiSanPham (ma_khuyen_mai, ma_san_pham) VALUES
 (1, 1), (1, 2), (1, 3),
 (2, 5),
 (3, 4);
