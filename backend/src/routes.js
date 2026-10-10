// Gắn routes của các module dưới /api. Module nào làm xong thì thêm dòng use() tương ứng.
const router = require('express').Router();
const pool = require('./config/db');
const { ok } = require('./utils/phan-hoi');

router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    ok(res, { may_chu: 'ok', csdl: 'ok' });
  } catch (e) {
    res.status(503).json({ ok: false, loi: 'CSDL_LOI', thong_bao: 'Không kết nối được CSDL (đã bật MySQL trong XAMPP chưa?)' });
  }
});

router.use('/auth', require('./modules/auth/auth.routes'));
const sanPham = require('./modules/san-pham/san-pham.routes');
router.use('/danh-muc', sanPham.danhMuc);
router.use('/san-pham', sanPham.sanPham);
router.use('/khach-hang', require('./modules/khach-hang/khach-hang.routes'));
router.use('/khuyen-mai', require('./modules/khuyen-mai/khuyen-mai.routes'));
router.use('/hoa-don', require('./modules/hoa-don/hoa-don.routes'));
router.use('/kho', require('./modules/kho/kho.routes'));
// Sprint 4: nhan-su | Sprint 5: bao-cao

module.exports = router;
