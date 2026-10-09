// khach-hang – routes (gắn dưới /api/khach-hang). Tạo/tìm: A/Q/N; sửa, lịch sử mua: A/Q.
const router = require('express').Router();
const validate = require('../../middlewares/validate');
const xacThuc = require('../../middlewares/xac-thuc');
const { choPhep, QUYEN } = require('../../middlewares/phan-quyen');
const controller = require('./khach-hang.controller');
const schema = require('./khach-hang.schema');

const quanTri = choPhep(QUYEN.ADMIN, QUYEN.QUAN_LY);

router.use(xacThuc);
router.post('/', validate({ body: schema.taoKhach }), controller.tao);                                                  // KH-01 (A/Q/N)
router.get('/', validate({ query: schema.timKhachQuery }), controller.tim);                                             // KH-03 (A/Q/N)
router.patch('/:ma', quanTri, validate({ params: schema.ma, body: schema.suaKhach }), controller.sua);                  // KH-02
router.get('/:ma/lich-su', quanTri, validate({ params: schema.ma, query: schema.lichSuQuery }), controller.lichSu);     // KH-04

module.exports = router;
