// san-pham – controller: nhận req, gọi service, trả phản hồi.
const service = require('./san-pham.service');
const { ok, danhSach } = require('../../utils/phan-hoi');
const { layPhanTrang } = require('../../utils/phan-trang');

// ----- Danh mục -----
exports.dsDanhMuc = async (req, res) => ok(res, await service.dsDanhMuc());
exports.taoDanhMuc = async (req, res) => ok(res, await service.taoDanhMuc(req.du_lieu.body), 201);
exports.suaDanhMuc = async (req, res) => ok(res, await service.suaDanhMuc(req.du_lieu.params.ma, req.du_lieu.body));
exports.xoaDanhMuc = async (req, res) => ok(res, await service.xoaDanhMuc(req.du_lieu.params.ma));

// ----- Sản phẩm -----
exports.menu = async (req, res) => ok(res, await service.layMenu(req.du_lieu.query));

exports.danhSach = async (req, res) => {
  const pt = layPhanTrang(req.du_lieu.query);
  const { rows, tong } = await service.layDanhSach(req.du_lieu.query, pt);
  danhSach(res, rows, tong, pt);
};

exports.chiTiet = async (req, res) => ok(res, await service.layChiTiet(req.du_lieu.params.ma));
exports.tao = async (req, res) => ok(res, await service.taoSanPham(req.du_lieu.body), 201);
exports.sua = async (req, res) => ok(res, await service.suaSanPham(req.du_lieu.params.ma, req.du_lieu.body));
exports.xoa = async (req, res) => ok(res, await service.xoaSanPham(req.du_lieu.params.ma));
