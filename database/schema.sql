-- =====================================================================
-- schema.sql – CSDL cafe_management (MySQL/MariaDB, XAMPP)
-- Nguồn: docs/cafe_erd.mmd. Chạy: import file này TRƯỚC seed.sql.
-- CẢNH BÁO: các lệnh DROP TABLE bên dưới xóa sạch dữ liệu cũ (chỉ dùng khi dev).
-- =====================================================================
CREATE DATABASE IF NOT EXISTS cafe_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cafe_management;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS ChiTietNhap, PhieuNhap, CongThuc, NguyenLieu, NhaCungCap,
  PhanCong, TaiKhoan, NhanVien, CaLamViec, ChiTietHoaDon, HoaDon,
  KhuyenMaiSanPham, KhuyenMai, KhachHang, SanPham, DanhMuc;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------- BÁN HÀNG ----------
CREATE TABLE DanhMuc (
  ma_danh_muc   INT AUTO_INCREMENT PRIMARY KEY,
  ten_danh_muc  VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_danhmuc_ten (ten_danh_muc)
) ENGINE=InnoDB;

CREATE TABLE SanPham (
  ma_san_pham   INT AUTO_INCREMENT PRIMARY KEY,
  ma_danh_muc   INT NOT NULL,
  ten_san_pham  VARCHAR(150) NOT NULL,
  gia_ban       DECIMAL(12,2) NOT NULL,
  trang_thai    ENUM('con_ban','ngung_ban') NOT NULL DEFAULT 'con_ban',
  CONSTRAINT ck_sanpham_gia CHECK (gia_ban >= 0),
  KEY idx_sanpham_danhmuc (ma_danh_muc),
  CONSTRAINT fk_sanpham_danhmuc FOREIGN KEY (ma_danh_muc) REFERENCES DanhMuc(ma_danh_muc)
) ENGINE=InnoDB;

-- ---------- KHÁCH HÀNG ----------
CREATE TABLE KhachHang (
  ma_khach_hang  INT AUTO_INCREMENT PRIMARY KEY,
  ten_khach_hang VARCHAR(100) NOT NULL,
  so_dien_thoai  VARCHAR(15)  NOT NULL,
  diem_tich_luy  INT NOT NULL DEFAULT 0,
  CONSTRAINT ck_khachhang_diem CHECK (diem_tich_luy >= 0),
  UNIQUE KEY uq_khachhang_sdt (so_dien_thoai)
) ENGINE=InnoDB;

-- ---------- NHÂN SỰ ----------
CREATE TABLE CaLamViec (
  ma_ca              INT AUTO_INCREMENT PRIMARY KEY,
  ten_ca             VARCHAR(50) NOT NULL,
  thoi_gian_bat_dau  TIME NOT NULL,
  thoi_gian_ket_thuc TIME NOT NULL
) ENGINE=InnoDB;

CREATE TABLE NhanVien (
  ma_nhan_vien   INT AUTO_INCREMENT PRIMARY KEY,
  ho_ten         VARCHAR(100) NOT NULL,
  chuc_vu        VARCHAR(50)  NOT NULL,
  so_dien_thoai  VARCHAR(15),
  trang_thai     ENUM('dang_lam','nghi_viec') NOT NULL DEFAULT 'dang_lam'
) ENGINE=InnoDB;

CREATE TABLE TaiKhoan (
  ma_tai_khoan    INT AUTO_INCREMENT PRIMARY KEY,
  ma_nhan_vien    INT NOT NULL,
  ten_dang_nhap   VARCHAR(50)  NOT NULL,
  mat_khau_hash   VARCHAR(255) NOT NULL,
  quyen_truy_cap  ENUM('admin','quan_ly','nhan_vien') NOT NULL,
  UNIQUE KEY uq_taikhoan_tendangnhap (ten_dang_nhap),
  UNIQUE KEY uq_taikhoan_nhanvien (ma_nhan_vien),            -- quan hệ 1-1 (||--o|)
  CONSTRAINT fk_taikhoan_nhanvien FOREIGN KEY (ma_nhan_vien) REFERENCES NhanVien(ma_nhan_vien)
) ENGINE=InnoDB;

CREATE TABLE PhanCong (
  ma_nhan_vien INT  NOT NULL,
  ma_ca        INT  NOT NULL,
  ngay_lam     DATE NOT NULL,
  PRIMARY KEY (ma_nhan_vien, ma_ca, ngay_lam),               -- chặn xếp trùng (NS-05)
  KEY idx_phancong_ca (ma_ca),
  CONSTRAINT fk_phancong_nhanvien FOREIGN KEY (ma_nhan_vien) REFERENCES NhanVien(ma_nhan_vien),
  CONSTRAINT fk_phancong_ca       FOREIGN KEY (ma_ca)        REFERENCES CaLamViec(ma_ca)
) ENGINE=InnoDB;

-- ---------- HÓA ĐƠN ----------
CREATE TABLE HoaDon (
  ma_hoa_don              INT AUTO_INCREMENT PRIMARY KEY,
  ma_khach_hang           INT NULL,                          -- NULL = khách vãng lai
  ma_nhan_vien            INT NOT NULL,                      -- nhân viên nhập order
  so_thu_tu               INT NOT NULL,                      -- reset mỗi ngày (xử lý ở service)
  thoi_gian_tao           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  trang_thai              ENUM('dang_pha_che','da_phuc_vu','da_thanh_toan','huy')
                          NOT NULL DEFAULT 'dang_pha_che',
  phuong_thuc_thanh_toan  ENUM('tien_mat','chuyen_khoan','vi') NULL,
  tong_tien               DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT ck_hoadon_tong CHECK (tong_tien >= 0),
  KEY idx_hoadon_khachhang (ma_khach_hang),
  KEY idx_hoadon_nhanvien  (ma_nhan_vien),
  KEY idx_hoadon_thoigian  (thoi_gian_tao),                  -- báo cáo theo ngày, danh sách order hôm nay
  KEY idx_hoadon_trangthai (trang_thai),
  CONSTRAINT fk_hoadon_khachhang FOREIGN KEY (ma_khach_hang) REFERENCES KhachHang(ma_khach_hang),
  CONSTRAINT fk_hoadon_nhanvien  FOREIGN KEY (ma_nhan_vien)  REFERENCES NhanVien(ma_nhan_vien)
) ENGINE=InnoDB;

-- ---------- KHUYẾN MÃI ----------
CREATE TABLE KhuyenMai (
  ma_khuyen_mai   INT AUTO_INCREMENT PRIMARY KEY,
  ten_khuyen_mai  VARCHAR(150) NOT NULL,
  loai_giam       ENUM('phan_tram','so_tien') NOT NULL,
  gia_tri_giam    DECIMAL(12,2) NOT NULL,
  ngay_bat_dau    DATETIME NOT NULL,
  ngay_ket_thuc   DATETIME NOT NULL,
  CONSTRAINT ck_km_gia_tri CHECK (gia_tri_giam > 0),
  CONSTRAINT ck_km_phan_tram CHECK (loai_giam <> 'phan_tram' OR gia_tri_giam <= 100),
  CONSTRAINT ck_km_ngay CHECK (ngay_bat_dau < ngay_ket_thuc)
) ENGINE=InnoDB;

CREATE TABLE KhuyenMaiSanPham (
  ma_khuyen_mai INT NOT NULL,
  ma_san_pham   INT NOT NULL,
  PRIMARY KEY (ma_khuyen_mai, ma_san_pham),
  KEY idx_kmsp_sanpham (ma_san_pham),
  CONSTRAINT fk_kmsp_khuyenmai FOREIGN KEY (ma_khuyen_mai) REFERENCES KhuyenMai(ma_khuyen_mai) ON DELETE CASCADE,
  CONSTRAINT fk_kmsp_sanpham   FOREIGN KEY (ma_san_pham)   REFERENCES SanPham(ma_san_pham)
) ENGINE=InnoDB;

CREATE TABLE ChiTietHoaDon (
  ma_chi_tiet    INT AUTO_INCREMENT PRIMARY KEY,
  ma_hoa_don     INT NOT NULL,
  ma_san_pham    INT NOT NULL,
  ma_khuyen_mai  INT NULL,                                   -- NULL = không giảm
  so_luong       INT NOT NULL,
  don_gia        DECIMAL(12,2) NOT NULL,                     -- snapshot giá lúc bán
  giam_gia       DECIMAL(12,2) NOT NULL DEFAULT 0,           -- snapshot số tiền đã giảm
  ghi_chu        VARCHAR(255) NULL,
  CONSTRAINT ck_cthd_soluong CHECK (so_luong >= 1),
  CONSTRAINT ck_cthd_gia CHECK (don_gia >= 0 AND giam_gia >= 0),
  KEY idx_cthd_hoadon   (ma_hoa_don),
  KEY idx_cthd_sanpham  (ma_san_pham),
  KEY idx_cthd_khuyenmai (ma_khuyen_mai),
  CONSTRAINT fk_cthd_hoadon    FOREIGN KEY (ma_hoa_don)    REFERENCES HoaDon(ma_hoa_don),
  CONSTRAINT fk_cthd_sanpham   FOREIGN KEY (ma_san_pham)   REFERENCES SanPham(ma_san_pham),
  CONSTRAINT fk_cthd_khuyenmai FOREIGN KEY (ma_khuyen_mai) REFERENCES KhuyenMai(ma_khuyen_mai)
) ENGINE=InnoDB;

-- ---------- KHO & NHẬP HÀNG ----------
CREATE TABLE NhaCungCap (
  ma_ncc         INT AUTO_INCREMENT PRIMARY KEY,
  ten_ncc        VARCHAR(150) NOT NULL,
  so_dien_thoai  VARCHAR(15),
  dia_chi        VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE NguyenLieu (
  ma_nguyen_lieu     INT AUTO_INCREMENT PRIMARY KEY,
  ten_nguyen_lieu    VARCHAR(100) NOT NULL,
  don_vi_tinh        VARCHAR(20)  NOT NULL,
  so_luong_ton       DECIMAL(14,3) NOT NULL DEFAULT 0,       -- KHÔNG được âm (ck_nl_ton): chốt chặn cuối của quy tắc "không đủ nguyên liệu"
  muc_ton_toi_thieu  DECIMAL(14,3) NOT NULL DEFAULT 0,
  CONSTRAINT ck_nl_ton CHECK (so_luong_ton >= 0),
  CONSTRAINT ck_nl_mintoi CHECK (muc_ton_toi_thieu >= 0),
  UNIQUE KEY uq_nguyenlieu_ten (ten_nguyen_lieu)
) ENGINE=InnoDB;

CREATE TABLE CongThuc (
  ma_san_pham     INT NOT NULL,
  ma_nguyen_lieu  INT NOT NULL,
  dinh_luong      DECIMAL(14,3) NOT NULL,                    -- cho 1 đơn vị sản phẩm
  PRIMARY KEY (ma_san_pham, ma_nguyen_lieu),
  KEY idx_congthuc_nguyenlieu (ma_nguyen_lieu),
  CONSTRAINT ck_congthuc_dl CHECK (dinh_luong > 0),
  CONSTRAINT fk_congthuc_sanpham    FOREIGN KEY (ma_san_pham)    REFERENCES SanPham(ma_san_pham),
  CONSTRAINT fk_congthuc_nguyenlieu FOREIGN KEY (ma_nguyen_lieu) REFERENCES NguyenLieu(ma_nguyen_lieu)
) ENGINE=InnoDB;

CREATE TABLE PhieuNhap (
  ma_phieu_nhap   INT AUTO_INCREMENT PRIMARY KEY,
  ma_ncc          INT NOT NULL,
  ma_nhan_vien    INT NOT NULL,
  ngay_nhap       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tong_tien_nhap  DECIMAL(14,2) NOT NULL DEFAULT 0,
  CONSTRAINT ck_phieunhap_tong CHECK (tong_tien_nhap >= 0),
  KEY idx_phieunhap_ncc (ma_ncc),
  KEY idx_phieunhap_nhanvien (ma_nhan_vien),
  KEY idx_phieunhap_ngay (ngay_nhap),
  CONSTRAINT fk_phieunhap_ncc      FOREIGN KEY (ma_ncc)       REFERENCES NhaCungCap(ma_ncc),
  CONSTRAINT fk_phieunhap_nhanvien FOREIGN KEY (ma_nhan_vien) REFERENCES NhanVien(ma_nhan_vien)
) ENGINE=InnoDB;

CREATE TABLE ChiTietNhap (
  ma_phieu_nhap   INT NOT NULL,
  ma_nguyen_lieu  INT NOT NULL,
  so_luong_nhap   DECIMAL(14,3) NOT NULL,
  don_gia_nhap    DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (ma_phieu_nhap, ma_nguyen_lieu),
  KEY idx_ctn_nguyenlieu (ma_nguyen_lieu),
  CONSTRAINT ck_ctn_sl CHECK (so_luong_nhap > 0),
  CONSTRAINT ck_ctn_gia CHECK (don_gia_nhap >= 0),
  CONSTRAINT fk_ctn_phieunhap  FOREIGN KEY (ma_phieu_nhap)  REFERENCES PhieuNhap(ma_phieu_nhap),
  CONSTRAINT fk_ctn_nguyenlieu FOREIGN KEY (ma_nguyen_lieu) REFERENCES NguyenLieu(ma_nguyen_lieu)
) ENGINE=InnoDB;
