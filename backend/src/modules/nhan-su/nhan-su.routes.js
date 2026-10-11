// nhan-su – routes (gắn dưới /api/nhan-su). Xem danh sách/chi tiết, sửa thông tin: A/Q. Tạo, xóa (và đổi quyền/đặt lại mật khẩu trong PATCH): chỉ A.
// NS-04 ca làm việc, NS-05 xếp lịch, NS-06 xóa phân công: A/Q. NS-07 lịch tuần: A/Q xem tất cả, N chỉ lịch của mình.
// Các đường dẫn tĩnh (ca-lam-viec, phan-cong, lich-tuan) PHẢI đứng TRƯỚC '/:ma'.
const router = require('express').Router();
const validate = require('../../middlewares/validate');
const xacThuc = require('../../middlewares/xac-thuc');
const { choPhep, QUYEN } = require('../../middlewares/phan-quyen');
const controller = require('./nhan-su.controller');
const schema = require('./nhan-su.schema');

const quanTri = choPhep(QUYEN.ADMIN, QUYEN.QUAN_LY);
const chiAdmin = choPhep(QUYEN.ADMIN);

router.use(xacThuc);
// NS-04
router.post('/ca-lam-viec', quanTri, validate({ body: schema.taoCa }), controller.taoCa);
router.get('/ca-lam-viec', quanTri, controller.danhSachCa);
router.get('/ca-lam-viec/:ma', quanTri, validate({ params: schema.ma }), controller.chiTietCa);
router.patch('/ca-lam-viec/:ma', quanTri, validate({ params: schema.ma, body: schema.suaCa }), controller.suaCa);
router.delete('/ca-lam-viec/:ma', quanTri, validate({ params: schema.ma }), controller.xoaCa);
// NS-05, NS-06
router.post('/phan-cong', quanTri, validate({ body: schema.xepLich }), controller.xepLich);
router.delete('/phan-cong', quanTri, validate({ query: schema.goPhanCongQuery }), controller.goPhanCong);
// NS-07 (mọi quyền; service giới hạn nhân viên chỉ xem của mình)
router.get('/lich-tuan', validate({ query: schema.lichTuanQuery }), controller.lichTuan);

router.post('/', chiAdmin, validate({ body: schema.taoNhanVien }), controller.taoNhanVien);                                    // NS-01
router.get('/', quanTri, validate({ query: schema.danhSachNhanVienQuery }), controller.danhSachNhanVien);
router.get('/:ma', quanTri, validate({ params: schema.ma }), controller.chiTietNhanVien);
router.patch('/:ma', quanTri, validate({ params: schema.ma, body: schema.suaNhanVien }), controller.suaNhanVien);              // NS-02 (quyền chi tiết ở service)
router.delete('/:ma', chiAdmin, validate({ params: schema.ma }), controller.xoaNhanVien);                                        // NS-03

module.exports = router;
