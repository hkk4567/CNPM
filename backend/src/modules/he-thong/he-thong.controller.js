// he-thong – controller: nhận req, gọi service, trả phản hồi.
const service = require('./he-thong.service');
const { ok } = require('../../utils/phan-hoi');

// HT-01: frontend gọi để biết trang/tab nào đang không khả dụng
async function trangAn(req, res) {
  ok(res, { trang_an: service.layTrangAn() });
}

module.exports = { trangAn };
