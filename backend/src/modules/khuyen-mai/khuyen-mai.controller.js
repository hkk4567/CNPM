// khuyen-mai – controller: nhận req, gọi service, trả phản hồi.
const service = require('./khuyen-mai.service');
const { ok, danhSach } = require('../../utils/phan-hoi');
const { layPhanTrang } = require('../../utils/phan-trang');

exports.tao = async (req, res) => ok(res, await service.taoKhuyenMai(req.du_lieu.body), 201);
exports.sua = async (req, res) => ok(res, await service.suaKhuyenMai(req.du_lieu.params.ma, req.du_lieu.body));
exports.xoa = async (req, res) => ok(res, await service.xoaKhuyenMai(req.du_lieu.params.ma));
exports.chiTiet = async (req, res) => ok(res, await service.layChiTiet(req.du_lieu.params.ma));
exports.themSanPham = async (req, res) => ok(res, await service.themSanPham(req.du_lieu.params.ma, req.du_lieu.body));
exports.goSanPham = async (req, res) => ok(res, await service.goSanPham(req.du_lieu.params.ma, req.du_lieu.params.ma_san_pham));

exports.baoCao = async (req, res) => ok(res, await service.baoCaoHieuQua(req.du_lieu.params.ma, req.du_lieu.query));

exports.danhSach = async (req, res) => {
  const pt = layPhanTrang(req.du_lieu.query);
  const { rows, tong } = await service.layDanhSach(req.du_lieu.query, pt);
  danhSach(res, rows, tong, pt);
};
