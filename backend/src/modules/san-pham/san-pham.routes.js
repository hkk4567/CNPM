// san-pham – routes. Xuất 2 router: danhMuc (gắn /api/danh-muc) và sanPham (gắn /api/san-pham).
// Xem (menu, danh mục): mọi người đã đăng nhập. Thêm/sửa/xóa, danh sách quản trị: admin + quan_ly.
const express = require('express');
const validate = require('../../middlewares/validate');
const xacThuc = require('../../middlewares/xac-thuc');
const { choPhep, QUYEN } = require('../../middlewares/phan-quyen');
const controller = require('./san-pham.controller');
const schema = require('./san-pham.schema');

const quanTri = choPhep(QUYEN.ADMIN, QUYEN.QUAN_LY);

const danhMuc = express.Router();
danhMuc.use(xacThuc);
danhMuc.get('/', controller.dsDanhMuc);                                                                               // SP-01
danhMuc.post('/', quanTri, validate({ body: schema.tenDanhMuc }), controller.taoDanhMuc);                              // SP-01
danhMuc.put('/:ma', quanTri, validate({ params: schema.ma, body: schema.tenDanhMuc }), controller.suaDanhMuc);         // SP-01
danhMuc.delete('/:ma', quanTri, validate({ params: schema.ma }), controller.xoaDanhMuc);                               // SP-01

const sanPham = express.Router();
sanPham.use(xacThuc);
sanPham.get('/menu', validate({ query: schema.menuQuery }), controller.menu);                                         // POS-01 (A/Q/N)
sanPham.get('/', quanTri, validate({ query: schema.danhSachQuery }), controller.danhSach);                             // SP-05
sanPham.get('/:ma', quanTri, validate({ params: schema.ma }), controller.chiTiet);                                     // SP-05
sanPham.post('/', quanTri, validate({ body: schema.taoSanPham }), controller.tao);                                     // SP-02
sanPham.patch('/:ma', quanTri, validate({ params: schema.ma, body: schema.suaSanPham }), controller.sua);              // SP-03
sanPham.delete('/:ma', quanTri, validate({ params: schema.ma }), controller.xoa);                                      // SP-04

module.exports = { danhMuc, sanPham };
