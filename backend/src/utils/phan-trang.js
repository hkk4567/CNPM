// Đọc ?trang=&moi_trang= từ query; trả { trang, moi_trang, limit, offset }.
function layPhanTrang(query = {}, macDinh = 20, toiDa = 100) {
  const trang = Math.max(1, parseInt(query.trang, 10) || 1);
  const moi = Math.min(Math.max(1, parseInt(query.moi_trang, 10) || macDinh), toiDa);
  return { trang, moi_trang: moi, limit: moi, offset: (trang - 1) * moi };
}

module.exports = { layPhanTrang };
