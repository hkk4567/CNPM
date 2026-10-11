// bao-cao – routes (BC-01..BC-06) dưới /api/bao-cao. Chỉ admin/quản lý.
const router = require('express').Router();
const validate = require('../../middlewares/validate');
const xacThuc = require('../../middlewares/xac-thuc');
const { choPhep, QUYEN } = require('../../middlewares/phan-quyen');
const controller = require('./bao-cao.controller');
const schema = require('./bao-cao.schema');

router.use(xacThuc, choPhep(QUYEN.ADMIN, QUYEN.QUAN_LY));
router.get('/doanh-thu', validate({ query: schema.theoNhom }), controller.doanhThu);                       // BC-01
router.get('/san-pham-ban-chay', validate({ query: schema.theoTop }), controller.banChay);                 // BC-02
router.get('/doanh-thu-theo-danh-muc', validate({ query: schema.khoangNgay }), controller.theoDanhMuc);    // BC-03
router.get('/phuong-thuc-thanh-toan', validate({ query: schema.khoangNgay }), controller.theoPhuongThuc);  // BC-04
router.get('/chi-phi-vs-doanh-thu', validate({ query: schema.theoNhom }), controller.chiPhiVsDoanhThu);    // BC-05
router.get('/doanh-thu-theo-nhan-vien', validate({ query: schema.khoangNgay }), controller.theoNhanVien);  // BC-06

module.exports = router;
