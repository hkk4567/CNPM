// kho – controller: nhận req, gọi service, trả phản hồi.
const service = require('./kho.service');
const { ok, danhSach } = require('../../utils/phan-hoi');
const { layPhanTrang } = require('../../utils/phan-trang');

// KHO-01
exports.taoNguyenLieu = async (req, res) => ok(res, await service.taoNguyenLieu(req.du_lieu.body), 201);
exports.chiTietNguyenLieu = async (req, res) => ok(res, await service.layNguyenLieu(req.du_lieu.params.ma));
exports.suaNguyenLieu = async (req, res) => ok(res, await service.suaNguyenLieu(req.du_lieu.params.ma, req.du_lieu.body));
exports.xoaNguyenLieu = async (req, res) => ok(res, await service.xoaNguyenLieu(req.du_lieu.params.ma));
exports.danhSachNguyenLieu = async (req, res) => {
  const pt = layPhanTrang(req.du_lieu.query);
  const { rows, tong } = await service.danhSachNguyenLieu(req.du_lieu.query, pt);
  danhSach(res, rows, tong, pt);
};

// KHO-02
exports.taoNcc = async (req, res) => ok(res, await service.taoNcc(req.du_lieu.body), 201);
exports.chiTietNcc = async (req, res) => ok(res, await service.layNcc(req.du_lieu.params.ma));
exports.suaNcc = async (req, res) => ok(res, await service.suaNcc(req.du_lieu.params.ma, req.du_lieu.body));
exports.xoaNcc = async (req, res) => ok(res, await service.xoaNcc(req.du_lieu.params.ma));
exports.danhSachNcc = async (req, res) => {
  const pt = layPhanTrang(req.du_lieu.query);
  const { rows, tong } = await service.danhSachNcc(req.du_lieu.query, pt);
  danhSach(res, rows, tong, pt);
};

// KHO-06: không phân trang (số nguyên liệu ít, cần thấy đủ cảnh báo)
exports.tonKho = async (req, res) => ok(res, await service.tonKho(req.du_lieu.query));

// KHO-03
exports.xemCongThuc = async (req, res) => ok(res, await service.xemCongThuc(req.du_lieu.params.ma));
exports.datCongThuc = async (req, res) => ok(res, await service.datCongThuc(req.du_lieu.params.ma, req.du_lieu.body.nguyen_lieu));

// KHO-04, KHO-05: tong_tien_nhap của lịch sử tính trên TOÀN BỘ kết quả lọc (không chỉ trang này)
exports.taoPhieuNhap = async (req, res) => ok(res, await service.taoPhieuNhap(req.nguoi_dung, req.du_lieu.body), 201);
exports.chiTietPhieuNhap = async (req, res) => ok(res, await service.chiTietPhieuNhap(req.du_lieu.params.ma));
exports.lichSuNhap = async (req, res) => {
  const pt = layPhanTrang(req.du_lieu.query);
  const { rows, tong, tong_tien_nhap: tongTien } = await service.lichSuNhap(req.du_lieu.query, pt);
  res.json({ ok: true, data: rows, tong_tien_nhap: tongTien, tong_so_ban_ghi: tong, trang: pt.trang, moi_trang: pt.moi_trang });
};
