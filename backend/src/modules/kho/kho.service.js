// kho – nghiệp vụ. Hiện có: kiểm tra đủ nguyên liệu để pha món (quy tắc "tồn kho không âm").
// Kho được TRỪ NGAY khi gọi món và TRẢ LẠI khi bỏ ly chưa làm (xem hoa-don.service). Phần còn lại của module kho (KHO-01..KHO-06) làm ở Sprint 3.
const repo = require('./kho.repository');
const { loi } = require('../../utils/loi-nghiep-vu');

const lamTron = n => Math.round(n * 1000) / 1000;

// Hàm thuần (dễ test): dongs = [{ ma_san_pham, so_luong }]; congThuc = hàng từ layCongThucVaTon.
// Gộp nhu cầu theo nguyên liệu trên TẤT CẢ dòng. Trả [{ ma_nguyen_lieu, ten_nguyen_lieu, don_vi_tinh, so_luong_ton, can_dung }].
function tinhNhuCau(dongs, congThuc) {
  const theoSanPham = new Map();
  for (const c of congThuc) {
    if (!theoSanPham.has(c.ma_san_pham)) theoSanPham.set(c.ma_san_pham, []);
    theoSanPham.get(c.ma_san_pham).push(c);
  }
  const tong = new Map();
  for (const d of dongs) {
    for (const c of theoSanPham.get(d.ma_san_pham) || []) { // sản phẩm chưa có công thức: không giới hạn
      const muc = tong.get(c.ma_nguyen_lieu) || {
        ma_nguyen_lieu: c.ma_nguyen_lieu, ten_nguyen_lieu: c.ten_nguyen_lieu, don_vi_tinh: c.don_vi_tinh,
        so_luong_ton: c.so_luong_ton, can_dung: 0,
      };
      muc.can_dung += d.so_luong * c.dinh_luong;
      tong.set(c.ma_nguyen_lieu, muc);
    }
  }
  return [...tong.values()].map(m => ({ ...m, can_dung: lamTron(m.can_dung), so_luong_ton: lamTron(m.so_luong_ton) }));
}

// Nguyên liệu còn thiếu (rỗng = đủ)
function tinhThieu(dongs, congThuc) {
  return tinhNhuCau(dongs, congThuc)
    .filter(m => m.can_dung > m.so_luong_ton)
    .map(m => ({ ...m, con_thieu: lamTron(m.can_dung - m.so_luong_ton) }));
}

// TRỪ KHO khi gọi món (tạo order, thêm món, tăng số lượng): chỉ trừ phần ly MỚI thêm. Phải gọi trong transaction của hóa đơn.
// Khóa các nguyên liệu liên quan TRƯỚC (FOR UPDATE, theo thứ tự mã), đọc lại tồn mới nhất, kiểm tra đủ rồi mới trừ:
// hai order đồng thời dùng chung nguyên liệu sẽ chạy nối tiếp, người đến sau thấy tồn đã giảm. Thiếu: 409 KHONG_DU_NGUYEN_LIEU, không trừ gì.
// Trả { canh_bao_kho } = các nguyên liệu vừa trừ mà tồn còn <= mức tối thiểu.
async function truKho(dongs, conn) {
  const dsMaSanPham = [...new Set(dongs.map(d => d.ma_san_pham))];
  const congThucTho = await repo.layCongThucVaTon(dsMaSanPham, conn);
  const dsMaNguyenLieu = [...new Set(congThucTho.map(c => c.ma_nguyen_lieu))].sort((a, b) => a - b);
  if (!dsMaNguyenLieu.length) return { canh_bao_kho: [] };

  const daKhoa = new Map((await repo.khoaNguyenLieu(dsMaNguyenLieu, conn)).map(r => [r.ma_nguyen_lieu, r]));
  const congThuc = congThucTho.map(c => ({ ...c, so_luong_ton: daKhoa.get(c.ma_nguyen_lieu).so_luong_ton })); // tồn MỚI NHẤT
  const nhuCau = tinhNhuCau(dongs, congThuc);
  const thieu = nhuCau.filter(m => m.can_dung > m.so_luong_ton).map(m => ({ ...m, con_thieu: lamTron(m.can_dung - m.so_luong_ton) }));
  if (thieu.length) throw loi.khongDuNguyenLieu(thieu);

  const canhBao = [];
  try {
    for (const m of nhuCau) {
      await repo.truTon(m.ma_nguyen_lieu, m.can_dung, conn);
      const conLai = lamTron(m.so_luong_ton - m.can_dung);
      const muc = daKhoa.get(m.ma_nguyen_lieu).muc_ton_toi_thieu;
      if (conLai <= muc) {
        canhBao.push({ ma_nguyen_lieu: m.ma_nguyen_lieu, ten_nguyen_lieu: m.ten_nguyen_lieu, don_vi_tinh: m.don_vi_tinh, so_luong_ton: conLai, muc_ton_toi_thieu: muc });
      }
    }
  } catch (e) {
    // Chốt chặn cuối: CHECK so_luong_ton >= 0 (MariaDB lỗi 4025, MySQL 8 lỗi 3819)
    if (e.errno === 4025 || e.errno === 3819) throw loi.xungDot('KHONG_DU_NGUYEN_LIEU', 'Không đủ nguyên liệu (kho vừa thay đổi), vui lòng thử lại');
    throw e;
  }
  return { canh_bao_kho: canhBao };
}

// TRẢ KHO khi bỏ ly CHƯA làm (xóa dòng, giảm số lượng, hủy order). dongs = [{ ma_san_pham, so_luong }] là số ly được trả.
// Khóa nguyên liệu cùng thứ tự với truKho. Ly ĐÃ làm thì KHÔNG đưa vào đây (nguyên liệu đã dùng, giữ nguyên số đã trừ).
async function traKho(dongs, conn) {
  const dsMaSanPham = [...new Set(dongs.map(d => d.ma_san_pham))];
  const congThuc = await repo.layCongThucVaTon(dsMaSanPham, conn);
  const dsMaNguyenLieu = [...new Set(congThuc.map(c => c.ma_nguyen_lieu))].sort((a, b) => a - b);
  if (!dsMaNguyenLieu.length) return;
  await repo.khoaNguyenLieu(dsMaNguyenLieu, conn);
  for (const m of tinhNhuCau(dongs, congThuc)) await repo.congTon(m.ma_nguyen_lieu, m.can_dung, conn);
}

module.exports = { tinhNhuCau, tinhThieu, truKho, traKho };
