// khongTimThay: route không tồn tại. xuLyLoi: mọi lỗi -> { ok: false, loi, thong_bao, chi_tiet? }.
const { LoiNghiepVu, loi } = require('../utils/loi-nghiep-vu');

const khongTimThay = (req, res, next) => next(loi.khongTimThay(`Không tìm thấy ${req.method} ${req.path}`));

// eslint-disable-next-line no-unused-vars
function xuLyLoi(err, req, res, next) {
  if (err instanceof LoiNghiepVu) {
    return res.status(err.status).json({ ok: false, loi: err.ma, thong_bao: err.message, chi_tiet: err.chiTiet });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, loi: 'DU_LIEU_SAI', thong_bao: 'Nội dung JSON không hợp lệ' });
  }
  console.error(err);
  res.status(500).json({ ok: false, loi: 'LOI_HE_THONG', thong_bao: 'Lỗi hệ thống, vui lòng thử lại' });
}

module.exports = { khongTimThay, xuLyLoi };
