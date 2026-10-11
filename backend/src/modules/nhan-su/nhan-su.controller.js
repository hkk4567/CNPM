// nhan-su – controller: nhận req, gọi service, trả phản hồi.
const service = require('./nhan-su.service');
const { ok, danhSach } = require('../../utils/phan-hoi');
const { layPhanTrang } = require('../../utils/phan-trang');

exports.taoNhanVien = async (req, res) => ok(res, await service.taoNhanVien(req.du_lieu.body), 201);
exports.chiTietNhanVien = async (req, res) => ok(res, await service.layNhanVien(req.du_lieu.params.ma));
exports.suaNhanVien = async (req, res) => ok(res, await service.suaNhanVien(req.nguoi_dung, req.du_lieu.params.ma, req.du_lieu.body));
exports.xoaNhanVien = async (req, res) => ok(res, await service.xoaNhanVien(req.nguoi_dung, req.du_lieu.params.ma));
exports.danhSachNhanVien = async (req, res) => {
  const pt = layPhanTrang(req.du_lieu.query);
  const { rows, tong } = await service.danhSachNhanVien(req.du_lieu.query, pt);
  danhSach(res, rows, tong, pt);
};

// NS-04: ca làm việc (ít ca nên không phân trang)
exports.taoCa = async (req, res) => ok(res, await service.taoCa(req.du_lieu.body), 201);
exports.danhSachCa = async (req, res) => ok(res, await service.danhSachCa());
exports.chiTietCa = async (req, res) => ok(res, await service.layCa(req.du_lieu.params.ma));
exports.suaCa = async (req, res) => ok(res, await service.suaCa(req.du_lieu.params.ma, req.du_lieu.body));
exports.xoaCa = async (req, res) => ok(res, await service.xoaCa(req.du_lieu.params.ma));

// NS-05..07
exports.xepLich = async (req, res) => ok(res, await service.xepLich(req.du_lieu.body), 201);
exports.goPhanCong = async (req, res) => ok(res, await service.goPhanCong(req.du_lieu.query));
exports.lichTuan = async (req, res) => {
  const kq = await service.lichTuan(req.nguoi_dung, req.du_lieu.query);
  res.json({ ok: true, data: kq.rows, tu_ngay: kq.tu_ngay, den_ngay: kq.den_ngay });
};
