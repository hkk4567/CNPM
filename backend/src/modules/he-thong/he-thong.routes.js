// he-thong – routes (gắn dưới /api/he-thong). HT-01: GET /trang-an – mọi quyền đã đăng nhập đều đọc được.
const router = require('express').Router();
const xacThuc = require('../../middlewares/xac-thuc');
const controller = require('./he-thong.controller');

router.get('/trang-an', xacThuc, controller.trangAn);

module.exports = router;
