// bao-cao – controller: mọi báo cáo trả { ok, data: [...] }.
const service = require('./bao-cao.service');
const { ok } = require('../../utils/phan-hoi');

const bao = ham => async (req, res) => ok(res, await ham(req.du_lieu.query));
exports.doanhThu = bao(service.doanhThuTheoThoiGian);          // BC-01
exports.banChay = bao(service.sanPhamBanChay);                 // BC-02
exports.theoDanhMuc = bao(service.doanhThuTheoDanhMuc);        // BC-03
exports.theoPhuongThuc = bao(service.theoPhuongThuc);          // BC-04
exports.chiPhiVsDoanhThu = bao(service.chiPhiVsDoanhThu);      // BC-05
exports.theoNhanVien = bao(service.theoNhanVien);              // BC-06
