// khach-hang – nghiệp vụ. KH-01 tạo, KH-02 sửa, KH-03 tìm, KH-04 lịch sử mua (KH-05 để Sprint 4).
// Cho module khác dùng: layKhachHang, layKhachTheoSdt (POS-06), congDiem (POS-08).
const repo = require('./khach-hang.repository');
const { loi } = require('../../utils/loi-nghiep-vu');

const ERR_TRUNG = 1062; // UNIQUE so_dien_thoai bị vi phạm
const GIOI_HAN_TIM = 20;
const loiTrungSdt = () => loi.xungDot('TRUNG_SDT', 'Số điện thoại đã tồn tại');

async function layKhachHang(ma, conn) {
  const kh = await repo.timTheoMa(ma, conn);
  if (!kh) throw loi.khongTimThay('Không tìm thấy khách hàng');
  return kh;
}

// POS-06: tìm khách theo SĐT; chưa có thì 404 để giao diện gợi ý tạo mới (KH-01)
async function layKhachTheoSdt(sdt, conn) {
  const kh = await repo.timTheoSdt(sdt, conn);
  if (!kh) throw loi.khongTimThay('Chưa có khách hàng với số điện thoại này; hãy tạo khách mới');
  return kh;
}

// KH-01: điểm luôn bắt đầu từ 0 (cột mặc định)
async function taoKhach(d) {
  try {
    return await repo.timTheoMa(await repo.tao(d));
  } catch (e) {
    throw e.errno === ERR_TRUNG ? loiTrungSdt() : e;
  }
}

// KH-02: chỉ tên và SĐT; điểm không sửa được từ đây
async function suaKhach(ma, d) {
  await layKhachHang(ma);
  try {
    await repo.sua(ma, d);
  } catch (e) {
    throw e.errno === ERR_TRUNG ? loiTrungSdt() : e;
  }
  return repo.timTheoMa(ma);
}

const timKhach = ({ tu_khoa }) => repo.tim(tu_khoa, GIOI_HAN_TIM);

// KH-04
async function lichSuMua(ma, loc, phanTrang) {
  const khach = await layKhachHang(ma);
  const kq = await repo.lichSuMua(ma, loc, phanTrang);
  return { khach, ...kq };
}

// POS-08: khóa dòng khách TRƯỚC khi ghi snapshot/cộng điểm. Nếu không khóa trước, hai thanh toán của cùng một khách đồng thời
// đều giữ khóa chia sẻ (do kiểm tra khóa ngoại của HoaDonDaThanhToan) rồi cùng xin khóa ghi để cộng điểm -> DEADLOCK (MySQL 1213, API trả 500).
async function khoaKhach(ma, conn) {
  if (!(await repo.khoa(ma, conn))) throw loi.khongTimThay('Không tìm thấy khách hàng');
}

// POS-08: cộng điểm khi thanh toán (trong transaction của thanh toán). Trả điểm hiện tại sau khi cộng.
async function congDiem(ma, diem, conn) {
  if (diem > 0) await repo.congDiem(ma, diem, conn);
  const kh = await repo.timTheoMa(ma, conn);
  return kh.diem_tich_luy;
}

module.exports = { khoaKhach, layKhachHang, layKhachTheoSdt, taoKhach, suaKhach, timKhach, lichSuMua, congDiem };
