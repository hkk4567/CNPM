// Đọc lỗi từ ApiError: thông báo chung và lỗi theo từng trường (chi_tiet: [{ truong, thong_bao }]).
export const thongBaoLoi = e => e?.message || 'Có lỗi xảy ra, vui lòng thử lại';

export function loiTheoTruong(e) {
  const kq = {};
  if (Array.isArray(e?.chiTiet)) for (const c of e.chiTiet) if (c?.truong && !kq[c.truong]) kq[c.truong] = c.thong_bao;
  return kq;
}
