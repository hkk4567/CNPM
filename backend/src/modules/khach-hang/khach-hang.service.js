// khach-hang – nghiệp vụ. Hiện mới có layKhachHang cho hoa-don dùng; phần còn lại làm ở Sprint 2.
const repo = require('./khach-hang.repository');
const { loi } = require('../../utils/loi-nghiep-vu');

async function layKhachHang(ma, conn) {
  const kh = await repo.timTheoMa(ma, conn);
  if (!kh) throw loi.khongTimThay('Không tìm thấy khách hàng');
  return kh;
}

// POS-08: cộng điểm khi thanh toán (trong transaction của thanh toán). Trả điểm hiện tại sau khi cộng.
async function congDiem(ma, diem, conn) {
  if (diem > 0) await repo.congDiem(ma, diem, conn);
  const kh = await repo.timTheoMa(ma, conn);
  return kh.diem_tich_luy;
}

module.exports = { layKhachHang, congDiem };
