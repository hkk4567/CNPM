// kho – routes (gắn dưới /api/kho). Toàn bộ chỉ cho A/Q (ma trận phân quyền: Kho, nhập hàng, nhà cung cấp = A/Q).
// Việc TRỪ/TRẢ kho khi bán hàng không qua đây mà đi qua hoa-don.service -> kho.service.
const router = require('express').Router();
const validate = require('../../middlewares/validate');
const xacThuc = require('../../middlewares/xac-thuc');
const { choPhep, QUYEN } = require('../../middlewares/phan-quyen');
const controller = require('./kho.controller');
const schema = require('./kho.schema');

router.use(xacThuc, choPhep(QUYEN.ADMIN, QUYEN.QUAN_LY));

// KHO-01
router.post('/nguyen-lieu', validate({ body: schema.taoNguyenLieu }), controller.taoNguyenLieu);
router.get('/nguyen-lieu', validate({ query: schema.danhSachNguyenLieuQuery }), controller.danhSachNguyenLieu);
router.get('/nguyen-lieu/:ma', validate({ params: schema.ma }), controller.chiTietNguyenLieu);
router.patch('/nguyen-lieu/:ma', validate({ params: schema.ma, body: schema.suaNguyenLieu }), controller.suaNguyenLieu);
router.delete('/nguyen-lieu/:ma', validate({ params: schema.ma }), controller.xoaNguyenLieu);

// KHO-02
router.post('/nha-cung-cap', validate({ body: schema.taoNcc }), controller.taoNcc);
router.get('/nha-cung-cap', validate({ query: schema.danhSachNccQuery }), controller.danhSachNcc);
router.get('/nha-cung-cap/:ma', validate({ params: schema.ma }), controller.chiTietNcc);
router.patch('/nha-cung-cap/:ma', validate({ params: schema.ma, body: schema.suaNcc }), controller.suaNcc);
router.delete('/nha-cung-cap/:ma', validate({ params: schema.ma }), controller.xoaNcc);

// KHO-03 (PUT thay toàn bộ công thức của sản phẩm; GET xem)
router.get('/cong-thuc/:ma', validate({ params: schema.ma }), controller.xemCongThuc);
router.put('/cong-thuc/:ma', validate({ params: schema.ma, body: schema.datCongThuc }), controller.datCongThuc);

// KHO-04, KHO-05
router.post('/phieu-nhap', validate({ body: schema.taoPhieuNhap }), controller.taoPhieuNhap);
router.get('/phieu-nhap', validate({ query: schema.lichSuNhapQuery }), controller.lichSuNhap);
router.get('/phieu-nhap/:ma', validate({ params: schema.ma }), controller.chiTietPhieuNhap);

// KHO-06
router.get('/ton-kho', validate({ query: schema.tonKhoQuery }), controller.tonKho);

module.exports = router;
