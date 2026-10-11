// auth – routes (gắn dưới /api/auth). AUTH-01 đăng nhập, AUTH-02 đổi mật khẩu (A/Q/N, của chính mình).
const router = require('express').Router();
const validate = require('../../middlewares/validate');
const xacThuc = require('../../middlewares/xac-thuc');
const controller = require('./auth.controller');
const schema = require('./auth.schema');

router.post('/dang-nhap', validate({ body: schema.dangNhap }), controller.dangNhap); // AUTH-01
router.post('/doi-mat-khau', xacThuc, validate({ body: schema.doiMatKhau }), controller.doiMatKhau);              // AUTH-02
router.get('/toi', xacThuc, controller.thongTinCaNhan);                              // thông tin người đang đăng nhập

module.exports = router;
