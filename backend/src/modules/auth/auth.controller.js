// auth – controller: nhận req, gọi service, trả phản hồi.
const service = require('./auth.service');
const { ok } = require('../../utils/phan-hoi');

async function dangNhap(req, res) {
  ok(res, await service.dangNhap(req.du_lieu.body));
}

async function thongTinCaNhan(req, res) {
  ok(res, req.nguoi_dung);
}

async function doiMatKhau(req, res) {
  ok(res, await service.doiMatKhau(req.nguoi_dung, req.du_lieu.body));
}

module.exports = { dangNhap, thongTinCaNhan, doiMatKhau };
