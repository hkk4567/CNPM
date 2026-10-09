// hoa-don – routes (gắn dưới /api/hoa-don). Mọi quyền đã đăng nhập (A/Q/N) đều dùng được.
// POS-08 thanh toán, POS-11 xem/in hóa đơn.
const router = require('express').Router();
const validate = require('../../middlewares/validate');
const xacThuc = require('../../middlewares/xac-thuc');
const controller = require('./hoa-don.controller');
const schema = require('./hoa-don.schema');

router.use(xacThuc);
router.post('/', validate({ body: schema.taoOrder }), controller.tao);                  // POS-02
router.get('/', validate({ query: schema.danhSachQuery }), controller.danhSach);        // POS-10
router.post('/:ma/dong', validate({ params: schema.ma, body: schema.dong }), controller.themDong);                            // POS-03
router.patch('/:ma/dong/:ma_chi_tiet', validate({ params: schema.maVaChiTiet, body: schema.suaDong }), controller.suaDong);   // POS-04
router.delete('/:ma/dong/:ma_chi_tiet', validate({ params: schema.maVaChiTiet, query: schema.xoaDongQuery }), controller.xoaDong);                        // POS-05
router.patch('/:ma/trang-thai', validate({ params: schema.ma, body: schema.doiTrangThai }), controller.doiTrangThai);         // POS-07
router.post('/:ma/huy', validate({ params: schema.ma, body: schema.huy }), controller.huy);                                                     // POS-09
router.post('/:ma/thanh-toan', validate({ params: schema.ma, body: schema.thanhToan }), controller.thanhToan);                // POS-08
router.post('/:ma/khach-hang', validate({ params: schema.ma, body: schema.ganKhach }), controller.ganKhach);                  // POS-06
router.get('/:ma', validate({ params: schema.ma }), controller.chiTiet);                                                      // POS-11

module.exports = router;
