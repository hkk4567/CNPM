// khuyen-mai – routes (gắn dưới /api/khuyen-mai). Toàn bộ module chỉ dành cho admin + quản lý (nhân viên 403).
const router = require('express').Router();
const validate = require('../../middlewares/validate');
const xacThuc = require('../../middlewares/xac-thuc');
const { choPhep, QUYEN } = require('../../middlewares/phan-quyen');
const controller = require('./khuyen-mai.controller');
const schema = require('./khuyen-mai.schema');

router.use(xacThuc, choPhep(QUYEN.ADMIN, QUYEN.QUAN_LY));
router.post('/', validate({ body: schema.taoKhuyenMai }), controller.tao);                                                             // KM-01
router.get('/', validate({ query: schema.danhSachQuery }), controller.danhSach);                                                       // KM-06
router.get('/:ma', validate({ params: schema.ma }), controller.chiTiet);                                                               // xem chi tiết (ngoài đặc tả)
router.get('/:ma/bao-cao', validate({ params: schema.ma, query: schema.baoCaoQuery }), controller.baoCao);                           // KM-07
router.patch('/:ma', validate({ params: schema.ma, body: schema.suaKhuyenMai }), controller.sua);                                      // KM-02
router.delete('/:ma', validate({ params: schema.ma }), controller.xoa);                                                                // KM-03
router.post('/:ma/san-pham', validate({ params: schema.ma, body: schema.themSanPham }), controller.themSanPham);                       // KM-04
router.delete('/:ma/san-pham/:ma_san_pham', validate({ params: schema.maVaSanPham }), controller.goSanPham);                           // KM-05

module.exports = router;
