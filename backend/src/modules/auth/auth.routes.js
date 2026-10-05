// auth – routes (gắn dưới /api/auth). AUTH-02 (đổi mật khẩu) làm ở Sprint 4.
const router = require('express').Router();
const validate = require('../../middlewares/validate');
const xacThuc = require('../../middlewares/xac-thuc');
const controller = require('./auth.controller');
const schema = require('./auth.schema');

router.post('/dang-nhap', validate({ body: schema.dangNhap }), controller.dangNhap); // AUTH-01
router.get('/toi', xacThuc, controller.thongTinCaNhan);                              // thông tin người đang đăng nhập

module.exports = router;
