-- =====================================================================
-- du-lieu-bo-sung.sql - Du lieu bo sung cho he thong quan ly quan ca phe
--
-- Chay SAU database/schema.sql va database/seed.sql, bang phpMyAdmin hoac
-- mysql cli. KHONG chay lai schema.sql sau khi da co du lieu can giu vi
-- schema.sql co DROP TABLE. File nay khong xoa bang/du lieu cu.
--
-- Co the chay lai: cac ban ghi da co se duoc bo qua de han che tao trung.
-- Ten, gia va lich giao dich duoc tao phuc vu viec xem cac man hinh trong moi truong phat trien.
-- =====================================================================

USE cafe_management;
SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- 1. Danh muc va san pham bo sung
-- ---------------------------------------------------------------------
INSERT INTO DanhMuc (ten_danh_muc)
SELECT x.ten_danh_muc
FROM (
  SELECT 'Cà phê đặc biệt' AS ten_danh_muc UNION ALL
  SELECT 'Trà trái cây' UNION ALL
  SELECT 'Đá xay' UNION ALL
  SELECT 'Nước ép' UNION ALL
  SELECT 'Đồ ăn nhẹ'
) x
WHERE NOT EXISTS (SELECT 1 FROM DanhMuc d WHERE d.ten_danh_muc = x.ten_danh_muc);

INSERT INTO SanPham (ma_danh_muc, ten_san_pham, gia_ban, trang_thai)
SELECT d.ma_danh_muc, x.ten_san_pham, x.gia_ban, 'con_ban'
FROM (
  SELECT 'Cà phê đặc biệt' AS ten_danh_muc, 'Americano' AS ten_san_pham, 30000 AS gia_ban UNION ALL
  SELECT 'Cà phê đặc biệt', 'Latte', 39000 UNION ALL
  SELECT 'Cà phê đặc biệt', 'Cappuccino', 39000 UNION ALL
  SELECT 'Cà phê đặc biệt', 'Cà phê muối', 35000 UNION ALL
  SELECT 'Cà phê đặc biệt', 'Cold Brew', 38000 UNION ALL
  SELECT 'Trà', 'Matcha Latte', 42000 UNION ALL
  SELECT 'Trà trái cây', 'Trà vải', 38000 UNION ALL
  SELECT 'Trà trái cây', 'Trà chanh mật ong', 32000 UNION ALL
  SELECT 'Trà trái cây', 'Trà dâu tây', 39000 UNION ALL
  SELECT 'Trà trái cây', 'Trà nhiệt đới', 42000 UNION ALL
  SELECT 'Đá xay', 'Matcha đá xay', 49000 UNION ALL
  SELECT 'Đá xay', 'Chocolate đá xay', 48000 UNION ALL
  SELECT 'Đá xay', 'Cà phê đá xay', 45000 UNION ALL
  SELECT 'Nước ép', 'Nước cam tươi', 39000 UNION ALL
  SELECT 'Nước ép', 'Nước ép ổi', 38000 UNION ALL
  SELECT 'Nước ép', 'Nước ép dưa hấu', 35000 UNION ALL
  SELECT 'Đồ ăn nhẹ', 'Cheesecake', 45000 UNION ALL
  SELECT 'Đồ ăn nhẹ', 'Cookie chocolate', 22000 UNION ALL
  SELECT 'Đồ ăn nhẹ', 'Muffin việt quất', 28000 UNION ALL
  SELECT 'Đồ ăn nhẹ', 'Bánh mì bơ tỏi', 29000
) x
JOIN DanhMuc d ON d.ten_danh_muc = x.ten_danh_muc
WHERE NOT EXISTS (SELECT 1 FROM SanPham s WHERE s.ten_san_pham = x.ten_san_pham);

-- ---------------------------------------------------------------------
-- 2. Nhan su, tai khoan dang nhap va lich lam viec
-- Mat khau ban dau: HanCafe2026 / KhoaCafe2026 / LongCafe2026 / LinhCafe2026
-- Yeu cau doi mat khau sau khi dang nhap neu dung trong moi truong that.
-- ---------------------------------------------------------------------
INSERT INTO NhanVien (ho_ten, chuc_vu, so_dien_thoai, trang_thai)
SELECT x.ho_ten, x.chuc_vu, x.so_dien_thoai, 'dang_lam'
FROM (
  SELECT 'Nguyễn Gia Hân' AS ho_ten, 'Pha chế' AS chuc_vu, '0909990011' AS so_dien_thoai UNION ALL
  SELECT 'Trần Minh Khoa', 'Thu ngân', '0909990012' UNION ALL
  SELECT 'Phạm Hoàng Long', 'Phục vụ', '0909990013' UNION ALL
  SELECT 'Võ Ngọc Linh', 'Pha chế', '0909990014'
) x
WHERE NOT EXISTS (SELECT 1 FROM NhanVien n WHERE n.so_dien_thoai = x.so_dien_thoai);

-- Moi nhan vien moi co mot tai khoan rieng, quyen nhan_vien.
-- Lien ket theo so dien thoai thay vi ma_nhan_vien de khong phu thuoc ID tu tang.
-- Bo qua neu nhan vien da co tai khoan hoac ten dang nhap da duoc su dung.
INSERT INTO TaiKhoan (ma_nhan_vien, ten_dang_nhap, mat_khau_hash, quyen_truy_cap)
SELECT n.ma_nhan_vien, x.ten_dang_nhap, x.mat_khau_hash, 'nhan_vien'
FROM (
  SELECT '0909990011' AS sdt, 'giahan' AS ten_dang_nhap,
         '$2b$10$NmmNU1nnrpZ.2IaURjC2EOIG0VvOSU2H2e6Rf58drouUyzztd/r2a' AS mat_khau_hash UNION ALL
  SELECT '0909990012', 'minhkhoa',
         '$2b$10$tqLQ/EDinV64iRaMg/YNre810a4YNbb38tyMVuE8D/O/aNz.THh72' UNION ALL
  SELECT '0909990013', 'hoanglong',
         '$2b$10$bP.KanWmMTQXCWqXMr7Gn.x.GB8.0YlSZLvsQ6KuM62pq2jh8tPMO' UNION ALL
  SELECT '0909990014', 'ngoclinh',
         '$2b$10$Pyp9fyCzup1M2LkCleOVwevo.AjdO01BC2YhfAfwNfhvi1rBedmI2'
) x
JOIN NhanVien n ON n.so_dien_thoai = x.sdt
WHERE NOT EXISTS (
  SELECT 1 FROM TaiKhoan t
  WHERE t.ma_nhan_vien = n.ma_nhan_vien OR t.ten_dang_nhap = x.ten_dang_nhap
);

INSERT IGNORE INTO PhanCong (ma_nhan_vien, ma_ca, ngay_lam)
SELECT n.ma_nhan_vien, c.ma_ca, DATE_ADD(CURDATE(), INTERVAL x.ngay DAY)
FROM (
  SELECT '0909990011' AS sdt, 'Ca sáng' AS ten_ca, 0 AS ngay UNION ALL
  SELECT '0909990012', 'Ca chiều', 0 UNION ALL
  SELECT '0909990013', 'Ca tối', 0 UNION ALL
  SELECT '0909990014', 'Ca sáng', 1 UNION ALL
  SELECT '0909990011', 'Ca chiều', 1 UNION ALL
  SELECT '0909990012', 'Ca tối', 1 UNION ALL
  SELECT '0909990013', 'Ca sáng', 2 UNION ALL
  SELECT '0909990014', 'Ca chiều', 2 UNION ALL
  SELECT '0909990011', 'Ca tối', 2 UNION ALL
  SELECT '0909990012', 'Ca sáng', 3 UNION ALL
  SELECT '0909990013', 'Ca chiều', 3 UNION ALL
  SELECT '0909990014', 'Ca tối', 3 UNION ALL
  SELECT '0909990011', 'Ca sáng', 4 UNION ALL
  SELECT '0909990012', 'Ca chiều', 4 UNION ALL
  SELECT '0909990013', 'Ca tối', 4 UNION ALL
  SELECT '0909990014', 'Ca sáng', 5 UNION ALL
  SELECT '0909990011', 'Ca chiều', 5 UNION ALL
  SELECT '0909990012', 'Ca tối', 5 UNION ALL
  SELECT '0909990013', 'Ca sáng', 6 UNION ALL
  SELECT '0909990014', 'Ca chiều', 6 UNION ALL
  SELECT '0909990011', 'Ca tối', 6
) x
JOIN NhanVien n ON n.so_dien_thoai = x.sdt
JOIN CaLamViec c ON c.ten_ca = x.ten_ca;

-- ---------------------------------------------------------------------
-- 3. Khach hang
-- ---------------------------------------------------------------------
INSERT INTO KhachHang (ten_khach_hang, so_dien_thoai, diem_tich_luy)
SELECT x.ten_khach_hang, x.so_dien_thoai, 0
FROM (
  SELECT 'Nguyễn Minh Khang' AS ten_khach_hang, '0909991001' AS so_dien_thoai UNION ALL
  SELECT 'Trần Ngọc Mai', '0909991002' UNION ALL
  SELECT 'Lê Hoàng Nam', '0909991003' UNION ALL
  SELECT 'Phạm Khánh Linh', '0909991004' UNION ALL
  SELECT 'Võ Thành Đạt', '0909991005' UNION ALL
  SELECT 'Đặng Thảo Vy', '0909991006' UNION ALL
  SELECT 'Bùi Gia Bảo', '0909991007' UNION ALL
  SELECT 'Đỗ Ngọc Anh', '0909991008' UNION ALL
  SELECT 'Hồ Quỳnh Như', '0909991009' UNION ALL
  SELECT 'Dương Quốc Huy', '0909991010' UNION ALL
  SELECT 'Phan Bảo Trân', '0909991011' UNION ALL
  SELECT 'Mai Đức Anh', '0909991012'
) x
WHERE NOT EXISTS (SELECT 1 FROM KhachHang k WHERE k.so_dien_thoai = x.so_dien_thoai);

-- ---------------------------------------------------------------------
-- 4. Nha cung cap va nguyen lieu cho menu mo rong
-- ---------------------------------------------------------------------
INSERT INTO NhaCungCap (ten_ncc, so_dien_thoai, dia_chi)
SELECT x.ten_ncc, x.so_dien_thoai, x.dia_chi
FROM (
  SELECT 'Công ty Nguyên Liệu Pha Chế Việt' AS ten_ncc, '0287000101' AS so_dien_thoai, 'TP. Hồ Chí Minh' AS dia_chi UNION ALL
  SELECT 'Trang trại Trái Cây Miền Nam', '0287000102', 'Đông Nam Bộ' UNION ALL
  SELECT 'Lò bánh Ngọt Sài Gòn', '0287000103', 'TP. Hồ Chí Minh' UNION ALL
  SELECT 'Công ty Sữa và Nguyên Liệu Pha Chế', '0287000104', 'TP. Hồ Chí Minh'
) x
WHERE NOT EXISTS (SELECT 1 FROM NhaCungCap n WHERE n.ten_ncc = x.ten_ncc);

INSERT INTO NguyenLieu (ten_nguyen_lieu, don_vi_tinh, so_luong_ton, muc_ton_toi_thieu)
SELECT x.ten_nguyen_lieu, x.don_vi_tinh, x.so_luong_ton, x.muc_ton_toi_thieu
FROM (
  SELECT 'Bột matcha' AS ten_nguyen_lieu, 'g' AS don_vi_tinh, 3000 AS so_luong_ton, 500 AS muc_ton_toi_thieu UNION ALL
  SELECT 'Bột cacao', 'g', 3000, 500 UNION ALL
  SELECT 'Syrup đào', 'ml', 3000, 500 UNION ALL
  SELECT 'Syrup vải', 'ml', 3000, 500 UNION ALL
  SELECT 'Syrup dâu', 'ml', 3000, 500 UNION ALL
  SELECT 'Cam tươi', 'g', 10000, 2000 UNION ALL
  SELECT 'Chanh tươi', 'g', 5000, 1000 UNION ALL
  SELECT 'Ổi tươi', 'g', 10000, 2000 UNION ALL
  SELECT 'Dưa hấu', 'g', 12000, 2500 UNION ALL
  SELECT 'Bột đá xay', 'g', 5000, 800 UNION ALL
  SELECT 'Kem tươi', 'ml', 4000, 800 UNION ALL
  SELECT 'Sữa chua', 'g', 5000, 800 UNION ALL
  SELECT 'Dâu tây', 'g', 5000, 800 UNION ALL
  SELECT 'Bột mì', 'g', 10000, 2000 UNION ALL
  SELECT 'Trứng gà', 'qua', 200, 30 UNION ALL
  SELECT 'Phô mai kem', 'g', 4000, 800 UNION ALL
  SELECT 'Chocolate chips', 'g', 3000, 500 UNION ALL
  SELECT 'Bơ lạt', 'g', 3000, 500 UNION ALL
  SELECT 'Bánh mì', 'o', 100, 20 UNION ALL
  SELECT 'Việt quất', 'g', 3000, 500 UNION ALL
  SELECT 'Mật ong', 'ml', 3000, 500 UNION ALL
  SELECT 'Bơ tươi', 'g', 5000, 1000
) x
WHERE NOT EXISTS (SELECT 1 FROM NguyenLieu n WHERE n.ten_nguyen_lieu = x.ten_nguyen_lieu);

-- Cong thuc: dinh luong cho mot san pham. INSERT IGNORE giu nguyen cong thuc da co.
INSERT IGNORE INTO CongThuc (ma_san_pham, ma_nguyen_lieu, dinh_luong)
SELECT s.ma_san_pham, n.ma_nguyen_lieu, x.dinh_luong
FROM (
  SELECT 'Americano' AS san_pham, 'Cà phê bột' AS nguyen_lieu, 18 AS dinh_luong UNION ALL
  SELECT 'Latte', 'Cà phê bột', 18 UNION ALL SELECT 'Latte', 'Sữa tươi', 180 UNION ALL
  SELECT 'Cappuccino', 'Cà phê bột', 18 UNION ALL SELECT 'Cappuccino', 'Sữa tươi', 120 UNION ALL SELECT 'Cappuccino', 'Kem tươi', 30 UNION ALL
  SELECT 'Cà phê muối', 'Cà phê bột', 20 UNION ALL SELECT 'Cà phê muối', 'Sữa đặc', 25 UNION ALL SELECT 'Cà phê muối', 'Kem tươi', 20 UNION ALL
  SELECT 'Cold Brew', 'Cà phê bột', 25 UNION ALL
  SELECT 'Matcha Latte', 'Bột matcha', 5 UNION ALL SELECT 'Matcha Latte', 'Sữa tươi', 180 UNION ALL SELECT 'Matcha Latte', 'Đường', 12 UNION ALL
  SELECT 'Trà đào cam sả', 'Trà đen', 8 UNION ALL SELECT 'Trà đào cam sả', 'Syrup đào', 35 UNION ALL SELECT 'Trà đào cam sả', 'Đường', 12 UNION ALL
  SELECT 'Trà đào cam sả', 'Cam tươi', 20 UNION ALL SELECT 'Trà đào cam sả', 'Chanh tươi', 10 UNION ALL
  SELECT 'Trà vải', 'Trà đen', 8 UNION ALL SELECT 'Trà vải', 'Syrup vải', 35 UNION ALL SELECT 'Trà vải', 'Đường', 12 UNION ALL
  SELECT 'Trà vải', 'Chanh tươi', 10 UNION ALL
  SELECT 'Trà chanh mật ong', 'Trà đen', 7 UNION ALL SELECT 'Trà chanh mật ong', 'Chanh tươi', 30 UNION ALL
  SELECT 'Trà chanh mật ong', 'Mật ong', 25 UNION ALL SELECT 'Trà chanh mật ong', 'Đường', 10 UNION ALL
  SELECT 'Trà dâu tây', 'Trà đen', 8 UNION ALL SELECT 'Trà dâu tây', 'Syrup dâu', 30 UNION ALL
  SELECT 'Trà dâu tây', 'Dâu tây', 40 UNION ALL SELECT 'Trà dâu tây', 'Đường', 10 UNION ALL
  SELECT 'Trà nhiệt đới', 'Trà đen', 8 UNION ALL SELECT 'Trà nhiệt đới', 'Syrup đào', 15 UNION ALL
  SELECT 'Trà nhiệt đới', 'Syrup vải', 15 UNION ALL SELECT 'Trà nhiệt đới', 'Cam tươi', 20 UNION ALL SELECT 'Trà nhiệt đới', 'Dâu tây', 20 UNION ALL
  SELECT 'Matcha đá xay', 'Bột matcha', 6 UNION ALL SELECT 'Matcha đá xay', 'Sữa tươi', 150 UNION ALL
  SELECT 'Matcha đá xay', 'Bột đá xay', 35 UNION ALL SELECT 'Matcha đá xay', 'Kem tươi', 20 UNION ALL
  SELECT 'Chocolate đá xay', 'Bột cacao', 18 UNION ALL SELECT 'Chocolate đá xay', 'Sữa tươi', 150 UNION ALL
  SELECT 'Chocolate đá xay', 'Bột đá xay', 35 UNION ALL SELECT 'Chocolate đá xay', 'Kem tươi', 20 UNION ALL
  SELECT 'Chocolate đá xay', 'Chocolate chips', 10 UNION ALL
  SELECT 'Cà phê đá xay', 'Cà phê bột', 18 UNION ALL SELECT 'Cà phê đá xay', 'Sữa tươi', 120 UNION ALL
  SELECT 'Cà phê đá xay', 'Bột đá xay', 35 UNION ALL SELECT 'Cà phê đá xay', 'Kem tươi', 15 UNION ALL
  SELECT 'Nước cam tươi', 'Cam tươi', 250 UNION ALL SELECT 'Nước ép ổi', 'Ổi tươi', 250 UNION ALL SELECT 'Nước ép dưa hấu', 'Dưa hấu', 300 UNION ALL
  SELECT 'Sinh tố bơ', 'Bơ tươi', 80 UNION ALL SELECT 'Sinh tố bơ', 'Sữa tươi', 100 UNION ALL SELECT 'Sinh tố bơ', 'Sữa chua', 30 UNION ALL
  SELECT 'Cheesecake', 'Phô mai kem', 60 UNION ALL SELECT 'Cheesecake', 'Trứng gà', 1 UNION ALL SELECT 'Cheesecake', 'Bột mì', 20 UNION ALL
  SELECT 'Cookie chocolate', 'Bột mì', 45 UNION ALL SELECT 'Cookie chocolate', 'Trứng gà', 1 UNION ALL SELECT 'Cookie chocolate', 'Chocolate chips', 15 UNION ALL
  SELECT 'Muffin việt quất', 'Bột mì', 70 UNION ALL SELECT 'Muffin việt quất', 'Trứng gà', 1 UNION ALL SELECT 'Muffin việt quất', 'Việt quất', 15 UNION ALL
  SELECT 'Bánh mì bơ tỏi', 'Bánh mì', 1 UNION ALL SELECT 'Bánh mì bơ tỏi', 'Bơ lạt', 15
) x
JOIN SanPham s ON s.ten_san_pham = x.san_pham
JOIN NguyenLieu n ON n.ten_nguyen_lieu = x.nguyen_lieu;

-- ---------------------------------------------------------------------
-- 5. Khuyen mai (co ca giam theo phan tram va so tien)
-- ---------------------------------------------------------------------
INSERT INTO KhuyenMai (ten_khuyen_mai, loai_giam, gia_tri_giam, ngay_bat_dau, ngay_ket_thuc)
SELECT x.ten_khuyen_mai, x.loai_giam, x.gia_tri_giam,
       DATE_SUB(NOW(), INTERVAL 60 DAY), DATE_ADD(NOW(), INTERVAL 30 DAY)
FROM (
  SELECT 'Giảm 10% nhóm cà phê đặc biệt' AS ten_khuyen_mai, 'phan_tram' AS loai_giam, 10 AS gia_tri_giam UNION ALL
  SELECT 'Giảm 5.000đ trà trái cây', 'so_tien', 5000 UNION ALL
  SELECT 'Giảm 8.000đ Matcha Latte', 'so_tien', 8000 UNION ALL
  SELECT 'Giảm 10% đồ ăn nhẹ', 'phan_tram', 10
) x
WHERE NOT EXISTS (SELECT 1 FROM KhuyenMai k WHERE k.ten_khuyen_mai = x.ten_khuyen_mai);

INSERT IGNORE INTO KhuyenMaiSanPham (ma_khuyen_mai, ma_san_pham)
SELECT km.ma_khuyen_mai, s.ma_san_pham
FROM (
  SELECT 'Giảm 10% nhóm cà phê đặc biệt' AS ten_khuyen_mai, 'Americano' AS ten_san_pham UNION ALL
  SELECT 'Giảm 10% nhóm cà phê đặc biệt', 'Latte' UNION ALL
  SELECT 'Giảm 10% nhóm cà phê đặc biệt', 'Cappuccino' UNION ALL
  SELECT 'Giảm 10% nhóm cà phê đặc biệt', 'Cà phê muối' UNION ALL
  SELECT 'Giảm 10% nhóm cà phê đặc biệt', 'Cold Brew' UNION ALL
  SELECT 'Giảm 10% nhóm cà phê đặc biệt', 'Cà phê đá xay' UNION ALL
  SELECT 'Giảm 5.000đ trà trái cây', 'Trà đào cam sả' UNION ALL
  SELECT 'Giảm 5.000đ trà trái cây', 'Trà vải' UNION ALL
  SELECT 'Giảm 5.000đ trà trái cây', 'Trà chanh mật ong' UNION ALL
  SELECT 'Giảm 5.000đ trà trái cây', 'Trà dâu tây' UNION ALL
  SELECT 'Giảm 5.000đ trà trái cây', 'Trà nhiệt đới' UNION ALL
  SELECT 'Giảm 8.000đ Matcha Latte', 'Matcha Latte' UNION ALL
  SELECT 'Giảm 10% đồ ăn nhẹ', 'Cheesecake' UNION ALL
  SELECT 'Giảm 10% đồ ăn nhẹ', 'Cookie chocolate' UNION ALL
  SELECT 'Giảm 10% đồ ăn nhẹ', 'Muffin việt quất' UNION ALL
  SELECT 'Giảm 10% đồ ăn nhẹ', 'Bánh mì bơ tỏi'
) x
JOIN KhuyenMai km ON km.ten_khuyen_mai = x.ten_khuyen_mai
JOIN SanPham s ON s.ten_san_pham = x.ten_san_pham;

-- ---------------------------------------------------------------------
-- 6. Cac bang tam luu du lieu se them vao cac bang chinh. Chay lai se bo qua dong cu.
-- ---------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS bo_sung_don_hang;
DROP TEMPORARY TABLE IF EXISTS bo_sung_dong_hang;
DROP TEMPORARY TABLE IF EXISTS bo_sung_phieu_nhap;
DROP TEMPORARY TABLE IF EXISTS bo_sung_chi_tiet_nhap;
DROP TEMPORARY TABLE IF EXISTS bo_sung_nhap_moi;
DROP TEMPORARY TABLE IF EXISTS bo_sung_dong_hang_moi;

CREATE TEMPORARY TABLE bo_sung_don_hang (
  bo_sung_key INT PRIMARY KEY,
  ngay_truoc INT NOT NULL,
  gio_tao TIME NOT NULL,
  so_thu_tu INT NOT NULL,
  sdt_khach VARCHAR(15) NULL,
  sdt_nhan_vien VARCHAR(15) NOT NULL,
  phuong_thuc VARCHAR(20) NOT NULL
) ENGINE=InnoDB;

INSERT INTO bo_sung_don_hang VALUES
(1,0,'08:15:00',1,'0909991001','0909990011','tien_mat'),
(2,0,'09:40:00',2,'0909991002','0909990012','chuyen_khoan'),
(3,1,'07:45:00',1,'0909991003','0909990013','vi'),
(4,1,'12:20:00',2,NULL,'0909990014','tien_mat'),
(5,2,'08:05:00',1,'0909991004','0909990011','chuyen_khoan'),
(6,2,'14:30:00',2,'0909991005','0909990012','tien_mat'),
(7,3,'09:12:00',1,'0909991006','0909990013','vi'),
(8,3,'16:25:00',2,'0909991007','0909990014','chuyen_khoan'),
(9,4,'08:50:00',1,'0909991008','0909990011','tien_mat'),
(10,4,'13:10:00',2,NULL,'0909990012','vi'),
(11,5,'07:55:00',1,'0909991009','0909990013','chuyen_khoan'),
(12,5,'15:35:00',2,'0909991010','0909990014','tien_mat'),
(13,6,'09:05:00',1,'0909991011','0909990011','vi'),
(14,6,'17:05:00',2,NULL,'0909990012','tien_mat'),
(15,7,'08:25:00',1,'0909991012','0909990013','chuyen_khoan'),
(16,7,'14:15:00',2,'0909991001','0909990014','vi'),
(17,8,'09:30:00',1,'0909991002','0909990011','tien_mat'),
(18,8,'16:10:00',2,'0909991003','0909990012','chuyen_khoan'),
(19,10,'08:35:00',1,NULL,'0909990013','tien_mat'),
(20,10,'13:45:00',2,'0909991004','0909990014','vi'),
(21,12,'07:40:00',1,'0909991005','0909990011','chuyen_khoan'),
(22,12,'15:20:00',2,'0909991006','0909990012','tien_mat'),
(23,15,'09:00:00',1,'0909991007','0909990013','vi'),
(24,15,'16:40:00',2,'0909991008','0909990014','chuyen_khoan'),
(25,18,'08:10:00',1,'0909991009','0909990011','tien_mat'),
(26,18,'13:30:00',2,'0909991010','0909990012','vi'),
(27,22,'09:20:00',1,'0909991011','0909990013','chuyen_khoan'),
(28,22,'16:00:00',2,'0909991012','0909990014','tien_mat');

CREATE TEMPORARY TABLE bo_sung_dong_hang (
  bo_sung_key INT NOT NULL,
  dong_so INT NOT NULL,
  ten_san_pham VARCHAR(150) NOT NULL,
  so_luong INT NOT NULL,
  ghi_chu VARCHAR(255) NULL,
  ten_khuyen_mai VARCHAR(150) NULL,
  PRIMARY KEY (bo_sung_key, dong_so)
) ENGINE=InnoDB;

INSERT INTO bo_sung_dong_hang VALUES
(1,1,'Latte',2,'Ít đá','Giảm 10% nhóm cà phê đặc biệt'),(1,2,'Cheesecake',1,NULL,'Giảm 10% đồ ăn nhẹ'),
(2,1,'Matcha Latte',2,'Ít ngọt','Giảm 8.000đ Matcha Latte'),(2,2,'Trà vải',1,NULL,'Giảm 5.000đ trà trái cây'),
(3,1,'Trà đào cam sả',2,'Ít ngọt','Giảm 5.000đ trà trái cây'),(3,2,'Cappuccino',1,NULL,'Giảm 10% nhóm cà phê đặc biệt'),
(4,1,'Nước cam tươi',2,NULL,NULL),(4,2,'Cookie chocolate',1,NULL,'Giảm 10% đồ ăn nhẹ'),
(5,1,'Cà phê muối',1,'Ít ngọt','Giảm 10% nhóm cà phê đặc biệt'),(5,2,'Trà chanh mật ong',2,'Ít đá','Giảm 5.000đ trà trái cây'),
(6,1,'Matcha đá xay',1,NULL,NULL),(6,2,'Bánh mì bơ tỏi',1,'Làm nóng','Giảm 10% đồ ăn nhẹ'),
(7,1,'Sinh tố bơ',1,'Ít đường',NULL),(7,2,'Nước ép ổi',1,NULL,NULL),
(8,1,'Cold Brew',2,NULL,'Giảm 10% nhóm cà phê đặc biệt'),(8,2,'Muffin việt quất',1,NULL,'Giảm 10% đồ ăn nhẹ'),
(9,1,'Trà dâu tây',2,'Ít ngọt','Giảm 5.000đ trà trái cây'),(9,2,'Cà phê đá xay',1,NULL,'Giảm 10% nhóm cà phê đặc biệt'),
(10,1,'Chocolate đá xay',1,NULL,NULL),(10,2,'Cheesecake',2,NULL,'Giảm 10% đồ ăn nhẹ'),
(11,1,'Cappuccino',2,NULL,'Giảm 10% nhóm cà phê đặc biệt'),(11,2,'Trà nhiệt đới',1,'Ít đá','Giảm 5.000đ trà trái cây'),
(12,1,'Nước ép dưa hấu',2,NULL,NULL),(12,2,'Matcha Latte',1,NULL,'Giảm 8.000đ Matcha Latte'),
(13,1,'Latte',1,'Nóng','Giảm 10% nhóm cà phê đặc biệt'),(13,2,'Cookie chocolate',2,NULL,'Giảm 10% đồ ăn nhẹ'),
(14,1,'Trà vải',2,'Ít ngọt','Giảm 5.000đ trà trái cây'),(14,2,'Nước cam tươi',1,NULL,NULL),
(15,1,'Cà phê muối',2,NULL,'Giảm 10% nhóm cà phê đặc biệt'),(15,2,'Muffin việt quất',1,NULL,'Giảm 10% đồ ăn nhẹ'),
(16,1,'Matcha đá xay',2,NULL,NULL),(16,2,'Trà chanh mật ong',1,NULL,'Giảm 5.000đ trà trái cây'),
(17,1,'Americano',2,NULL,'Giảm 10% nhóm cà phê đặc biệt'),(17,2,'Bánh mì bơ tỏi',1,NULL,'Giảm 10% đồ ăn nhẹ'),
(18,1,'Trà đào cam sả',1,NULL,'Giảm 5.000đ trà trái cây'),(18,2,'Cheesecake',1,NULL,'Giảm 10% đồ ăn nhẹ'),
(19,1,'Sinh tố bơ',2,NULL,NULL),(19,2,'Cold Brew',1,NULL,'Giảm 10% nhóm cà phê đặc biệt'),
(20,1,'Nước ép ổi',2,NULL,NULL),(20,2,'Trà dâu tây',1,NULL,'Giảm 5.000đ trà trái cây'),
(21,1,'Chocolate đá xay',2,NULL,NULL),(21,2,'Latte',1,NULL,'Giảm 10% nhóm cà phê đặc biệt'),
(22,1,'Trà nhiệt đới',2,NULL,'Giảm 5.000đ trà trái cây'),(22,2,'Cookie chocolate',1,NULL,'Giảm 10% đồ ăn nhẹ'),
(23,1,'Cappuccino',1,NULL,'Giảm 10% nhóm cà phê đặc biệt'),(23,2,'Nước cam tươi',2,NULL,NULL),
(24,1,'Matcha Latte',2,NULL,'Giảm 8.000đ Matcha Latte'),(24,2,'Bánh mì bơ tỏi',1,NULL,'Giảm 10% đồ ăn nhẹ'),
(25,1,'Nước ép dưa hấu',2,NULL,NULL),(25,2,'Cheesecake',1,NULL,'Giảm 10% đồ ăn nhẹ'),
(26,1,'Cold Brew',1,NULL,'Giảm 10% nhóm cà phê đặc biệt'),(26,2,'Trà vải',2,NULL,'Giảm 5.000đ trà trái cây'),
(27,1,'Latte',2,NULL,'Giảm 10% nhóm cà phê đặc biệt'),(27,2,'Muffin việt quất',1,NULL,'Giảm 10% đồ ăn nhẹ'),
(28,1,'Sinh tố bơ',1,NULL,NULL),(28,2,'Trà nhiệt đới',2,NULL,'Giảm 5.000đ trà trái cây');

CREATE TEMPORARY TABLE bo_sung_phieu_nhap (
  bo_sung_key INT PRIMARY KEY,
  ngay_truoc INT NOT NULL,
  gio_nhap TIME NOT NULL,
  ten_ncc VARCHAR(150) NOT NULL,
  sdt_nhan_vien VARCHAR(15) NOT NULL
) ENGINE=InnoDB;
INSERT INTO bo_sung_phieu_nhap VALUES
(1,24,'08:30:00','Công ty Nguyên Liệu Pha Chế Việt','0909990012'),
(2,16,'09:15:00','Trang trại Trái Cây Miền Nam','0909990012'),
(3,8,'08:45:00','Lò bánh Ngọt Sài Gòn','0909990012'),
(4,2,'10:00:00','Công ty Sữa và Nguyên Liệu Pha Chế','0909990012');

CREATE TEMPORARY TABLE bo_sung_chi_tiet_nhap (
  bo_sung_key INT NOT NULL,
  ten_nguyen_lieu VARCHAR(100) NOT NULL,
  so_luong_nhap DECIMAL(14,3) NOT NULL,
  don_gia_nhap DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (bo_sung_key, ten_nguyen_lieu)
) ENGINE=InnoDB;
INSERT INTO bo_sung_chi_tiet_nhap VALUES
(1,'Cà phê bột',1000,210),(1,'Trà đen',500,95),(1,'Bột matcha',500,320),(1,'Bột cacao',500,160),(1,'Syrup đào',500,70),(1,'Syrup vải',500,75),
(2,'Cam tươi',2500,22),(2,'Chanh tươi',1000,18),(2,'Ổi tươi',2500,16),(2,'Dưa hấu',3000,12),(2,'Dâu tây',1000,65),(2,'Việt quất',300,120),(2,'Bơ tươi',2000,35),
(3,'Bột mì',3000,18),(3,'Trứng gà',60,2500),(3,'Phô mai kem',1000,110),(3,'Chocolate chips',500,90),(3,'Bánh mì',25,6500),(3,'Bơ lạt',500,95),
(4,'Sữa tươi',3000,24),(4,'Kem tươi',1000,68),(4,'Sữa chua',1000,28),(4,'Mật ong',500,75),(4,'Syrup dâu',500,70),(4,'Bột đá xay',1000,35);

CREATE TEMPORARY TABLE bo_sung_nhap_moi (
  ma_phieu_nhap INT NOT NULL,
  ma_nguyen_lieu INT NOT NULL,
  so_luong_nhap DECIMAL(14,3) NOT NULL,
  don_gia_nhap DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (ma_phieu_nhap, ma_nguyen_lieu)
) ENGINE=InnoDB;

CREATE TEMPORARY TABLE bo_sung_dong_hang_moi (
  bo_sung_key INT NOT NULL,
  dong_so INT NOT NULL,
  ma_hoa_don INT NOT NULL,
  ma_san_pham INT NOT NULL,
  so_luong INT NOT NULL,
  ghi_chu VARCHAR(255) NULL,
  ten_khuyen_mai VARCHAR(150) NULL,
  PRIMARY KEY (ma_hoa_don, dong_so)
) ENGINE=InnoDB;

START TRANSACTION;

-- 6a. Tao phieu nhap neu chua ton tai.
INSERT INTO PhieuNhap (ma_ncc, ma_nhan_vien, ngay_nhap, tong_tien_nhap)
SELECT ncc.ma_ncc, nv.ma_nhan_vien,
       TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL d.ngay_truoc DAY), d.gio_nhap), 0
FROM bo_sung_phieu_nhap d
JOIN NhaCungCap ncc ON ncc.ten_ncc = d.ten_ncc
JOIN NhanVien nv ON nv.so_dien_thoai = d.sdt_nhan_vien
WHERE NOT EXISTS (
  SELECT 1 FROM PhieuNhap p WHERE p.ma_ncc = ncc.ma_ncc AND p.ma_nhan_vien = nv.ma_nhan_vien
    AND p.ngay_nhap = TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL d.ngay_truoc DAY), d.gio_nhap)
);

INSERT INTO bo_sung_nhap_moi (ma_phieu_nhap, ma_nguyen_lieu, so_luong_nhap, don_gia_nhap)
SELECT p.ma_phieu_nhap, n.ma_nguyen_lieu, l.so_luong_nhap, l.don_gia_nhap
FROM bo_sung_chi_tiet_nhap l
JOIN bo_sung_phieu_nhap d ON d.bo_sung_key = l.bo_sung_key
JOIN NhaCungCap ncc ON ncc.ten_ncc = d.ten_ncc
JOIN NhanVien nv ON nv.so_dien_thoai = d.sdt_nhan_vien
JOIN PhieuNhap p ON p.ma_ncc = ncc.ma_ncc AND p.ma_nhan_vien = nv.ma_nhan_vien
  AND p.ngay_nhap = TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL d.ngay_truoc DAY), d.gio_nhap)
JOIN NguyenLieu n ON n.ten_nguyen_lieu = l.ten_nguyen_lieu
WHERE NOT EXISTS (SELECT 1 FROM ChiTietNhap ct WHERE ct.ma_phieu_nhap = p.ma_phieu_nhap AND ct.ma_nguyen_lieu = n.ma_nguyen_lieu);

UPDATE NguyenLieu n
JOIN (SELECT ma_nguyen_lieu, SUM(so_luong_nhap) AS so_luong_tang FROM bo_sung_nhap_moi GROUP BY ma_nguyen_lieu) x
  ON x.ma_nguyen_lieu = n.ma_nguyen_lieu
SET n.so_luong_ton = n.so_luong_ton + x.so_luong_tang;

INSERT INTO ChiTietNhap (ma_phieu_nhap, ma_nguyen_lieu, so_luong_nhap, don_gia_nhap)
SELECT ma_phieu_nhap, ma_nguyen_lieu, so_luong_nhap, don_gia_nhap FROM bo_sung_nhap_moi;

UPDATE PhieuNhap p
JOIN (SELECT ma_phieu_nhap, SUM(so_luong_nhap * don_gia_nhap) AS tong FROM ChiTietNhap GROUP BY ma_phieu_nhap) x
  ON x.ma_phieu_nhap = p.ma_phieu_nhap
SET p.tong_tien_nhap = x.tong
WHERE p.ma_ncc IN (SELECT ma_ncc FROM NhaCungCap WHERE ten_ncc IN ('Công ty Nguyên Liệu Pha Chế Việt','Trang trại Trái Cây Miền Nam','Lò bánh Ngọt Sài Gòn','Công ty Sữa và Nguyên Liệu Pha Chế'));

-- 6b. Tao cac order da thanh toan; moi nhan vien co so_thu_tu rieng theo ngay.
INSERT INTO HoaDon (ma_khach_hang, ma_nhan_vien, so_thu_tu, thoi_gian_tao, trang_thai, phuong_thuc_thanh_toan, tong_tien)
SELECT k.ma_khach_hang, nv.ma_nhan_vien, d.so_thu_tu,
       TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL d.ngay_truoc DAY), d.gio_tao),
       'da_thanh_toan', d.phuong_thuc, 0
FROM bo_sung_don_hang d
JOIN NhanVien nv ON nv.so_dien_thoai = d.sdt_nhan_vien
LEFT JOIN KhachHang k ON k.so_dien_thoai = d.sdt_khach
WHERE (d.sdt_khach IS NULL OR k.ma_khach_hang IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM HoaDon h WHERE h.ma_nhan_vien = nv.ma_nhan_vien AND h.so_thu_tu = d.so_thu_tu
      AND h.thoi_gian_tao = TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL d.ngay_truoc DAY), d.gio_tao)
      AND h.ma_khach_hang <=> k.ma_khach_hang
  );

INSERT INTO bo_sung_dong_hang_moi (bo_sung_key, dong_so, ma_hoa_don, ma_san_pham, so_luong, ghi_chu, ten_khuyen_mai)
SELECT d.bo_sung_key, l.dong_so, h.ma_hoa_don, s.ma_san_pham, l.so_luong, l.ghi_chu, l.ten_khuyen_mai
FROM bo_sung_don_hang d
JOIN bo_sung_dong_hang l ON l.bo_sung_key = d.bo_sung_key
JOIN NhanVien nv ON nv.so_dien_thoai = d.sdt_nhan_vien
LEFT JOIN KhachHang k ON k.so_dien_thoai = d.sdt_khach
JOIN HoaDon h ON h.ma_nhan_vien = nv.ma_nhan_vien AND h.so_thu_tu = d.so_thu_tu
  AND h.thoi_gian_tao = TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL d.ngay_truoc DAY), d.gio_tao)
  AND h.ma_khach_hang <=> k.ma_khach_hang
JOIN SanPham s ON s.ten_san_pham = l.ten_san_pham
WHERE NOT EXISTS (
  SELECT 1 FROM ChiTietHoaDon ct WHERE ct.ma_hoa_don = h.ma_hoa_don
    AND ct.ma_san_pham = s.ma_san_pham AND ct.ghi_chu <=> l.ghi_chu
);

INSERT INTO ChiTietHoaDon (ma_hoa_don, ma_san_pham, so_luong, don_gia, giam_gia, ghi_chu)
SELECT x.ma_hoa_don, x.ma_san_pham, x.so_luong, s.gia_ban,
       CASE WHEN km.ma_khuyen_mai IS NULL THEN 0
            WHEN km.loai_giam = 'phan_tram' THEN LEAST(FLOOR(s.gia_ban * km.gia_tri_giam / 100), s.gia_ban) * x.so_luong
            ELSE LEAST(km.gia_tri_giam, s.gia_ban) * x.so_luong END,
       x.ghi_chu
FROM bo_sung_dong_hang_moi x
JOIN SanPham s ON s.ma_san_pham = x.ma_san_pham
LEFT JOIN KhuyenMai km ON km.ten_khuyen_mai = x.ten_khuyen_mai;

-- Snapshot muc giam theo tung ma khuyen mai tren mot ly.
INSERT IGNORE INTO ChiTietHoaDonKhuyenMai (ma_chi_tiet, ma_khuyen_mai, muc_giam_moi_ly)
SELECT ct.ma_chi_tiet, km.ma_khuyen_mai,
       CASE WHEN km.loai_giam = 'phan_tram' THEN LEAST(FLOOR(ct.don_gia * km.gia_tri_giam / 100), ct.don_gia)
            ELSE LEAST(km.gia_tri_giam, ct.don_gia) END
FROM bo_sung_dong_hang_moi x
JOIN ChiTietHoaDon ct ON ct.ma_hoa_don = x.ma_hoa_don AND ct.ma_san_pham = x.ma_san_pham AND ct.ghi_chu <=> x.ghi_chu
JOIN KhuyenMai km ON km.ten_khuyen_mai = x.ten_khuyen_mai
WHERE x.ten_khuyen_mai IS NOT NULL;

-- Tru kho chi cho cac dong hoa don moi vua chen vao, khong tru lap khi chay lai file.
UPDATE NguyenLieu n
JOIN (
  SELECT ct.ma_nguyen_lieu, SUM(x.so_luong * ct.dinh_luong) AS so_luong_dung
  FROM bo_sung_dong_hang_moi x JOIN CongThuc ct ON ct.ma_san_pham = x.ma_san_pham
  GROUP BY ct.ma_nguyen_lieu
) nhu_cau ON nhu_cau.ma_nguyen_lieu = n.ma_nguyen_lieu
SET n.so_luong_ton = n.so_luong_ton - nhu_cau.so_luong_dung;

-- Tinh lai tong tien header tu chi tiet.
UPDATE HoaDon h
JOIN (
  SELECT ct.ma_hoa_don, SUM(ct.so_luong * ct.don_gia - ct.giam_gia) AS tong_sau_giam
  FROM ChiTietHoaDon ct GROUP BY ct.ma_hoa_don
) x ON x.ma_hoa_don = h.ma_hoa_don
SET h.tong_tien = x.tong_sau_giam
WHERE EXISTS (SELECT 1 FROM NhanVien n WHERE n.ma_nhan_vien = h.ma_nhan_vien AND n.so_dien_thoai IN ('0909990011','0909990012','0909990013','0909990014'));

-- Bang snapshot bat bien la nguon cua cac bao cao doanh thu va lich su mua.
INSERT INTO HoaDonDaThanhToan (
  ma_hoa_don, ma_khach_hang, ma_nhan_vien, so_thu_tu, thoi_gian_tao,
  thoi_gian_thanh_toan, phuong_thuc_thanh_toan, tong_tien_hang, tong_giam_gia, tong_tien, diem_cong
)
SELECT h.ma_hoa_don, h.ma_khach_hang, h.ma_nhan_vien, h.so_thu_tu, h.thoi_gian_tao,
       DATE_ADD(h.thoi_gian_tao, INTERVAL (5 + MOD(h.so_thu_tu, 7)) MINUTE), h.phuong_thuc_thanh_toan,
       x.tong_hang, x.tong_giam, h.tong_tien,
       CASE WHEN h.ma_khach_hang IS NULL THEN 0 ELSE FLOOR(h.tong_tien / 10000) END
FROM HoaDon h
JOIN NhanVien nv ON nv.ma_nhan_vien = h.ma_nhan_vien
JOIN (SELECT ma_hoa_don, SUM(so_luong * don_gia) AS tong_hang, SUM(giam_gia) AS tong_giam FROM ChiTietHoaDon GROUP BY ma_hoa_don) x
  ON x.ma_hoa_don = h.ma_hoa_don
WHERE nv.so_dien_thoai IN ('0909990011','0909990012','0909990013','0909990014')
  AND h.trang_thai = 'da_thanh_toan'
  AND NOT EXISTS (SELECT 1 FROM HoaDonDaThanhToan p WHERE p.ma_hoa_don = h.ma_hoa_don);

-- Cap nhat diem khach hang dua tren bien lai da tao.
UPDATE KhachHang k
SET k.diem_tich_luy = (SELECT COALESCE(SUM(p.diem_cong), 0) FROM HoaDonDaThanhToan p WHERE p.ma_khach_hang = k.ma_khach_hang)
WHERE k.so_dien_thoai BETWEEN '0909991001' AND '0909991012';

COMMIT;

DROP TEMPORARY TABLE IF EXISTS bo_sung_don_hang;
DROP TEMPORARY TABLE IF EXISTS bo_sung_dong_hang;
DROP TEMPORARY TABLE IF EXISTS bo_sung_phieu_nhap;
DROP TEMPORARY TABLE IF EXISTS bo_sung_chi_tiet_nhap;
DROP TEMPORARY TABLE IF EXISTS bo_sung_nhap_moi;
DROP TEMPORARY TABLE IF EXISTS bo_sung_dong_hang_moi;

-- ---------------------------------------------------------------------
-- Thong ke nhanh sau khi nap (chay rieng neu can):
-- SELECT COUNT(*) AS tong_san_pham FROM SanPham;
-- SELECT COUNT(*) AS so_khach_hang_bo_sung FROM KhachHang WHERE so_dien_thoai BETWEEN '0909991001' AND '0909991012';
-- SELECT COUNT(*) AS so_hoa_don_bo_sung FROM HoaDon h JOIN NhanVien n ON n.ma_nhan_vien=h.ma_nhan_vien WHERE n.so_dien_thoai IN ('0909990011','0909990012','0909990013','0909990014');
-- SELECT COUNT(*) AS so_snapshot_bo_sung FROM HoaDonDaThanhToan p JOIN NhanVien n ON n.ma_nhan_vien=p.ma_nhan_vien WHERE n.so_dien_thoai IN ('0909990011','0909990012','0909990013','0909990014');
-- SELECT * FROM NguyenLieu WHERE so_luong_ton <= muc_ton_toi_thieu;
