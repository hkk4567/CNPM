// Quy tắc ẩn trang/tab (khớp backend/src/modules/he-thong/he-thong.service.js timTrangAn):
// mã "kho/lich-su-nhap" bị ẩn nếu chính nó hoặc trang cha "kho" có trong danh sách. Trả về { ma_an, ly_do, luc } hoặc null.
export function timTrangAn(trangAn, ma) {
  const cha = ma.includes('/') ? ma.split('/')[0] : null;
  for (const m of [ma, cha]) if (m && trangAn[m]) return { ma_an: m, ...trangAn[m] };
  return null;
}
