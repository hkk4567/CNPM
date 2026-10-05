// Lớp lỗi có mã HTTP + mã lỗi nghiệp vụ. Dùng: throw loi.xungDot('MA', 'Thông báo').
class LoiNghiepVu extends Error {
  constructor(status, ma, thongBao, chiTiet) {
    super(thongBao);
    this.name = 'LoiNghiepVu';
    this.status = status;
    this.ma = ma;
    this.chiTiet = chiTiet;
  }
}

const dinhDangSo = n => String(Number(Number(n).toFixed(3)));

const loi = {
  duLieuSai: (thongBao = 'Dữ liệu không hợp lệ', chiTiet) => new LoiNghiepVu(400, 'DU_LIEU_SAI', thongBao, chiTiet),
  yeuCauSai: (ma, thongBao, chiTiet) => new LoiNghiepVu(400, ma, thongBao, chiTiet),
  chuaDangNhap: (ma = 'CHUA_DANG_NHAP', thongBao = 'Chưa đăng nhập hoặc phiên đã hết hạn') => new LoiNghiepVu(401, ma, thongBao),
  khongDuQuyen: (thongBao = 'Bạn không có quyền thực hiện thao tác này', ma = 'KHONG_DU_QUYEN') => new LoiNghiepVu(403, ma, thongBao),
  khongTimThay: (thongBao = 'Không tìm thấy') => new LoiNghiepVu(404, 'KHONG_TIM_THAY', thongBao),
  xungDot: (ma, thongBao, chiTiet) => new LoiNghiepVu(409, ma, thongBao, chiTiet),

  // chiTiet: [{ ten_nguyen_lieu, don_vi_tinh, so_luong_ton, can_dung, con_thieu }]
  khongDuNguyenLieu(chiTiet) {
    const ds = chiTiet.map(c => {
      const thieu = c.con_thieu ?? (c.can_dung - c.so_luong_ton);
      return `${c.ten_nguyen_lieu} cần ${dinhDangSo(c.can_dung)} ${c.don_vi_tinh}, còn ${dinhDangSo(c.so_luong_ton)} ${c.don_vi_tinh} (thiếu ${dinhDangSo(thieu)} ${c.don_vi_tinh})`;
    });
    return new LoiNghiepVu(409, 'KHONG_DU_NGUYEN_LIEU', `Không đủ nguyên liệu: ${ds.join('; ')}`, chiTiet);
  },
};

module.exports = { LoiNghiepVu, loi };
