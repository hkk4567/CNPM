-- =====================================================================
-- verify.sql – kiểm tra schema + seed + các đoạn SQL cốt lõi của đặc tả.
-- Chạy: mysql -u root --force cafe_management < database/verify.sql
--   (XAMPP: C:\xampp\mysql\bin\mysql.exe -u root --force cafe_management < database\verify.sql)
-- Mọi thay đổi nằm trong transaction và ROLLBACK ở cuối, không làm bẩn dữ liệu mẫu.
-- Kỳ vọng: đúng 7 dòng ERROR (các ca thử vi phạm ràng buộc, đánh dấu [LOI]).
-- =====================================================================
USE cafe_management;
SET NAMES utf8mb4;

-- [1] Khuyến mãi hiệu lực cho sản phẩm 1 (Cà phê đen). Kỳ vọng: ma_khuyen_mai=1, so_tien_giam=2500.00
SELECT km.ma_khuyen_mai,
       CASE km.loai_giam WHEN 'phan_tram' THEN sp.gia_ban * km.gia_tri_giam / 100
                         ELSE km.gia_tri_giam END AS so_tien_giam
FROM KhuyenMaiSanPham kmsp
JOIN KhuyenMai km ON km.ma_khuyen_mai = kmsp.ma_khuyen_mai
JOIN SanPham sp   ON sp.ma_san_pham  = kmsp.ma_san_pham
WHERE kmsp.ma_san_pham = 1 AND NOW() BETWEEN km.ngay_bat_dau AND km.ngay_ket_thuc
ORDER BY so_tien_giam DESC LIMIT 1;

-- [2] Sản phẩm 4 chỉ có khuyến mãi đã hết hạn. Kỳ vọng: 0 dòng
SELECT km.ma_khuyen_mai FROM KhuyenMaiSanPham kmsp
JOIN KhuyenMai km ON km.ma_khuyen_mai = kmsp.ma_khuyen_mai
WHERE kmsp.ma_san_pham = 4 AND NOW() BETWEEN km.ngay_bat_dau AND km.ngay_ket_thuc;

-- [3] Thanh toán (POS-08) trong transaction
START TRANSACTION;
INSERT INTO HoaDon (ma_khach_hang, ma_nhan_vien, so_thu_tu) VALUES (1, 3, 1);
SET @id = LAST_INSERT_ID();
-- Hai dòng CÙNG sản phẩm 2, ghi chú khác nhau (kiểm tra khóa chính ma_chi_tiet). giam_gia = tổng giảm của dòng.
INSERT INTO ChiTietHoaDon (ma_hoa_don, ma_san_pham, ma_khuyen_mai, so_luong, don_gia, giam_gia, ghi_chu) VALUES
 (@id, 2, 1,    2, 29000, 5800, 'it duong'),
 (@id, 2, NULL, 1, 29000,    0, 'binh thuong');

-- [LOI] 1/7: SĐT khách trùng (UNIQUE)
INSERT INTO KhachHang (ten_khach_hang, so_dien_thoai) VALUES ('Trung SDT', '0911111111');
-- [LOI] 2/7: số lượng = 0 (CHECK)
INSERT INTO ChiTietHoaDon (ma_hoa_don, ma_san_pham, so_luong, don_gia) VALUES (@id, 1, 0, 25000);
-- [LOI] 3/7: xếp ca trùng (khóa chính PhanCong)
INSERT INTO PhanCong (ma_nhan_vien, ma_ca, ngay_lam) VALUES (3, 2, CURDATE());
-- [LOI] 4/7: khuyến mãi phần trăm > 100 (CHECK)
INSERT INTO KhuyenMai (ten_khuyen_mai, loai_giam, gia_tri_giam, ngay_bat_dau, ngay_ket_thuc)
 VALUES ('Sai', 'phan_tram', 150, NOW(), NOW() + INTERVAL 1 DAY);
-- [LOI] 5/7: ngày bắt đầu >= ngày kết thúc (CHECK)
INSERT INTO KhuyenMai (ten_khuyen_mai, loai_giam, gia_tri_giam, ngay_bat_dau, ngay_ket_thuc)
 VALUES ('Sai ngay', 'so_tien', 1000, NOW() + INTERVAL 1 DAY, NOW());
-- [LOI] 6/7: tên đăng nhập trùng (UNIQUE)
INSERT INTO TaiKhoan (ma_nhan_vien, ten_dang_nhap, mat_khau_hash, quyen_truy_cap) VALUES (4, 'admin', 'x', 'nhan_vien');

UPDATE HoaDon
SET trang_thai = 'da_thanh_toan', phuong_thuc_thanh_toan = 'tien_mat',
    tong_tien = (SELECT SUM(so_luong * don_gia - giam_gia) FROM ChiTietHoaDon WHERE ma_hoa_don = @id)
WHERE ma_hoa_don = @id AND trang_thai <> 'da_thanh_toan';

UPDATE KhachHang k JOIN HoaDon h ON h.ma_khach_hang = k.ma_khach_hang
SET k.diem_tich_luy = k.diem_tich_luy + FLOOR(h.tong_tien / 10000)
WHERE h.ma_hoa_don = @id;

UPDATE NguyenLieu nl JOIN (
  SELECT ct.ma_nguyen_lieu, SUM(c.so_luong * ct.dinh_luong) AS can_tru
  FROM ChiTietHoaDon c JOIN CongThuc ct ON ct.ma_san_pham = c.ma_san_pham
  WHERE c.ma_hoa_don = @id GROUP BY ct.ma_nguyen_lieu
) x ON x.ma_nguyen_lieu = nl.ma_nguyen_lieu
SET nl.so_luong_ton = nl.so_luong_ton - x.can_tru;

-- Kỳ vọng: tong_tien=81200.00, diem_tich_luy=20 (12+8), Cà phê bột=4940.000, Sữa đặc=3910.000
SELECT h.tong_tien, k.diem_tich_luy FROM HoaDon h JOIN KhachHang k USING (ma_khach_hang) WHERE h.ma_hoa_don = @id;
SELECT ten_nguyen_lieu, so_luong_ton FROM NguyenLieu WHERE ma_nguyen_lieu IN (1, 2);
ROLLBACK;

-- [4] Sau ROLLBACK dữ liệu mẫu còn nguyên. Kỳ vọng: 0 hóa đơn, Cà phê bột=5000.000, điểm khách 1 = 12
SELECT (SELECT COUNT(*) FROM HoaDon) AS so_hoa_don,
       (SELECT so_luong_ton FROM NguyenLieu WHERE ma_nguyen_lieu = 1) AS ca_phe_bot,
       (SELECT diem_tich_luy FROM KhachHang WHERE ma_khach_hang = 1) AS diem_khach_1;

-- [5] Cảnh báo kho (KHO-06). Kỳ vọng: 1 dòng (Trân châu)
SELECT ten_nguyen_lieu, so_luong_ton, muc_ton_toi_thieu FROM NguyenLieu WHERE so_luong_ton <= muc_ton_toi_thieu;

-- [6] Số ly tối đa theo tồn kho (POS-01).
-- Kỳ vọng: sp1=250, sp2=133, sp3=133, sp5=16 (sản phẩm chưa có công thức thì không hiện = không giới hạn)
SELECT sp.ma_san_pham, sp.ten_san_pham, MIN(FLOOR(nl.so_luong_ton / ct.dinh_luong)) AS so_ly_toi_da
FROM SanPham sp
JOIN CongThuc ct   ON ct.ma_san_pham = sp.ma_san_pham
JOIN NguyenLieu nl ON nl.ma_nguyen_lieu = ct.ma_nguyen_lieu
GROUP BY sp.ma_san_pham, sp.ten_san_pham
ORDER BY sp.ma_san_pham;

-- [7] Không đủ nguyên liệu: tồn cà phê bột còn 4g, 1 ly cà phê đen cần 20g
START TRANSACTION;
INSERT INTO HoaDon (ma_nhan_vien, so_thu_tu) VALUES (3, 2);
SET @id2 = LAST_INSERT_ID();
INSERT INTO ChiTietHoaDon (ma_hoa_don, ma_san_pham, so_luong, don_gia, giam_gia) VALUES (@id2, 1, 1, 25000, 0);
UPDATE NguyenLieu SET so_luong_ton = 4 WHERE ma_nguyen_lieu = 1;

-- Kiểm tra thiếu nguyên liệu cho order. Kỳ vọng: Cà phê bột | g | 4.000 | 20.000 | 16.000
SELECT nl.ten_nguyen_lieu, nl.don_vi_tinh, nl.so_luong_ton, x.can_dung, x.can_dung - nl.so_luong_ton AS con_thieu
FROM NguyenLieu nl
JOIN (
  SELECT ct.ma_nguyen_lieu, SUM(c.so_luong * ct.dinh_luong) AS can_dung
  FROM ChiTietHoaDon c JOIN CongThuc ct ON ct.ma_san_pham = c.ma_san_pham
  WHERE c.ma_hoa_don = @id2 GROUP BY ct.ma_nguyen_lieu
) x ON x.ma_nguyen_lieu = nl.ma_nguyen_lieu
WHERE nl.so_luong_ton < x.can_dung;

-- Số ly tối đa của Cà phê đen lúc này. Kỳ vọng: 0
SELECT MIN(FLOOR(nl.so_luong_ton / ct.dinh_luong)) AS so_ly_toi_da
FROM CongThuc ct JOIN NguyenLieu nl ON nl.ma_nguyen_lieu = ct.ma_nguyen_lieu
WHERE ct.ma_san_pham = 1;

-- [LOI] 7/7: bỏ qua bước kiểm tra mà trừ kho thẳng -> tồn âm bị CHECK ck_nl_ton chặn
UPDATE NguyenLieu nl JOIN (
  SELECT ct.ma_nguyen_lieu, SUM(c.so_luong * ct.dinh_luong) AS can_tru
  FROM ChiTietHoaDon c JOIN CongThuc ct ON ct.ma_san_pham = c.ma_san_pham
  WHERE c.ma_hoa_don = @id2 GROUP BY ct.ma_nguyen_lieu
) x ON x.ma_nguyen_lieu = nl.ma_nguyen_lieu
SET nl.so_luong_ton = nl.so_luong_ton - x.can_tru;
SELECT ten_nguyen_lieu, so_luong_ton FROM NguyenLieu WHERE ma_nguyen_lieu = 1;  -- vẫn 4.000 (không âm)
ROLLBACK;
-- Kiểm tra bảng HoaDonDaThanhToan có tồn tại hay không
SELECT
    'Bang HoaDonDaThanhToan ton tai' AS test_case,
    EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = 'HoaDonDaThanhToan'
    ) AS passed;

-- Kiểm tra Trigger trg_readonly_hoadondathanhtoan có tồn tại hay không
SELECT
    'Trigger trg_readonly_hoadondathanhtoan ton tai' AS test_case,
    EXISTS (
        SELECT 1
        FROM information_schema.triggers
        WHERE trigger_schema = DATABASE()
          AND trigger_name = 'trg_readonly_hoadondathanhtoan'
    ) AS passed;