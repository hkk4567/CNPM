// Định dạng phản hồi thành công: { ok: true, data }.
const ok = (res, data, status = 200) => res.status(status).json({ ok: true, data });

// Danh sách có phân trang: data là mảng, kèm tong_so_ban_ghi, trang, moi_trang.
const danhSach = (res, data, tongSoBanGhi, { trang, moi_trang }) =>
  res.json({ ok: true, data, tong_so_ban_ghi: tongSoBanGhi, trang, moi_trang });

module.exports = { ok, danhSach };
