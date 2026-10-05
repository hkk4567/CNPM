// hoa-don – controller: nhận req, gọi service, trả phản hồi.
const service = require('./hoa-don.service');
const { ok, danhSach } = require('../../utils/phan-hoi');
const { layPhanTrang } = require('../../utils/phan-trang');

exports.tao = async (req, res) => ok(res, await service.taoOrder(req.nguoi_dung, req.du_lieu.body), 201);

exports.themDong = async (req, res) => ok(res, await service.themDong(req.du_lieu.params.ma, req.du_lieu.body), 201);
exports.suaDong = async (req, res) => ok(res, await service.suaDong(req.du_lieu.params.ma, req.du_lieu.params.ma_chi_tiet, req.du_lieu.body));
exports.xoaDong = async (req, res) => ok(res, await service.xoaDong(req.du_lieu.params.ma, req.du_lieu.params.ma_chi_tiet));
exports.doiTrangThai = async (req, res) => ok(res, await service.doiTrangThai(req.du_lieu.params.ma, req.du_lieu.body.trang_thai_moi));
exports.huy = async (req, res) => ok(res, await service.huy(req.du_lieu.params.ma));
exports.thanhToan = async (req, res) => ok(res, await service.thanhToan(req.du_lieu.params.ma, req.du_lieu.body));
exports.chiTiet = async (req, res) => ok(res, await service.layHoaDonChiTiet(req.nguoi_dung, req.du_lieu.params.ma));

exports.danhSach = async (req, res) => {
  const pt = layPhanTrang(req.du_lieu.query, 50, 200);
  const { rows, tong } = await service.layDanhSach(req.nguoi_dung, req.du_lieu.query, pt);
  danhSach(res, rows, tong, pt);
};
