// khach-hang – controller: nhận req, gọi service, trả phản hồi.
const service = require('./khach-hang.service');
const { ok } = require('../../utils/phan-hoi');
const { layPhanTrang } = require('../../utils/phan-trang');

exports.tao = async (req, res) => ok(res, await service.taoKhach(req.du_lieu.body), 201);
exports.sua = async (req, res) => ok(res, await service.suaKhach(req.du_lieu.params.ma, req.du_lieu.body));
exports.tim = async (req, res) => ok(res, await service.timKhach(req.du_lieu.query));

// KH-04: danh sách hóa đơn + tổng chi tiêu (tong_chi_tieu, so_don tính trên TOÀN BỘ kết quả lọc, không chỉ trang này)
exports.lichSu = async (req, res) => {
  const pt = layPhanTrang(req.du_lieu.query);
  const { khach, rows, so_don, tong_chi_tieu } = await service.lichSuMua(req.du_lieu.params.ma, req.du_lieu.query, pt);
  res.json({ ok: true, data: rows, khach_hang: khach, tong_chi_tieu, tong_so_ban_ghi: so_don, trang: pt.trang, moi_trang: pt.moi_trang });
};
