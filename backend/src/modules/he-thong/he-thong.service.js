// he-thong – service (HT-01): quy tắc ẩn/hiện trang. Không phụ thuộc CSDL/.env nên scripts/an-trang/an-trang.js dùng lại được khi chưa bật XAMPP.
const repo = require('./he-thong.repository');
const { DANH_SACH, laMaHopLe } = require('../../config/trang');
const { loi } = require('../../utils/loi-nghiep-vu');

const LY_DO_MAC_DINH = 'Trang đang được bảo trì, vui lòng quay lại sau.';
const LY_DO_TOI_DA = 200;

// Danh sách đang ẩn cho frontend. Đọc lỗi (file hỏng, hoặc đang bị khóa tạm thời trên Windows lúc script đổi tên file) thì trả về
// bản đọc tốt gần nhất (khởi động mà file hỏng = không ẩn gì), để trang đang ẩn không bị mở nhầm; chỉ cảnh báo ở console backend.
let docTotCuoi = {};
function layTrangAn() {
  try { docTotCuoi = repo.doc(); } catch (e) {
    console.warn(`[he-thong] Không đọc được ${repo.duongDan()}: ${e.message}. Giữ danh sách đọc được lần trước.`);
  }
  return docTotCuoi;
}

// Mã "kho/lich-su-nhap" bị ẩn nếu chính nó hoặc trang cha "kho" có trong danh sách. Trả về { ma_an, ly_do, luc } hoặc null.
function timTrangAn(trangAn, ma) {
  if (typeof ma !== 'string' || !ma) return null;
  const cha = ma.includes('/') ? ma.split('/')[0] : null;
  for (const m of [ma, cha]) if (m && trangAn[m]) return { ma_an: m, ...trangAn[m] };
  return null;
}

function kiemTraMa(dsMa) {
  if (!dsMa.length) throw loi.duLieuSai('Chưa nêu mã trang nào');
  const sai = dsMa.filter(m => !laMaHopLe(m));
  if (sai.length) throw loi.duLieuSai(`Mã trang không hợp lệ: ${sai.join(', ')}`, { ma_hop_le: DANH_SACH.map(t => t.ma) });
}

// Ẩn các trang. Trả về { da_an: [...] }. Ẩn lại trang đã ẩn = cập nhật lý do/thời điểm.
function an(dsMa, lyDo) {
  const ma = [...new Set(dsMa)];
  kiemTraMa(ma);
  const ly = (lyDo ?? '').trim() || LY_DO_MAC_DINH;
  if (ly.length > LY_DO_TOI_DA) throw loi.duLieuSai(`Lý do tối đa ${LY_DO_TOI_DA} ký tự`);
  const duLieu = repo.doc(); // file hỏng thì ném lỗi, không ghi đè
  const luc = new Date().toISOString();
  for (const m of ma) duLieu[m] = { ly_do: ly, luc };
  repo.ghi(duLieu);
  return { da_an: ma, ly_do: ly };
}

// Hiện lại các trang. Trả về { da_hien, khong_an, van_bi_che } (van_bi_che: tab vẫn ẩn vì trang cha đang ẩn).
function hien(dsMa) {
  const ma = [...new Set(dsMa)];
  kiemTraMa(ma);
  const duLieu = repo.doc();
  const kq = { da_hien: [], khong_an: [], van_bi_che: [] };
  for (const m of ma) {
    if (duLieu[m]) { delete duLieu[m]; kq.da_hien.push(m); } else kq.khong_an.push(m);
  }
  repo.ghi(duLieu);
  for (const m of ma) if (timTrangAn(duLieu, m)) kq.van_bi_che.push(m);
  return kq;
}

function hienHet() {
  const so = Object.keys(repo.doc()).length;
  repo.ghi({});
  return { da_hien: so };
}

module.exports = { layTrangAn, timTrangAn, an, hien, hienHet, LY_DO_MAC_DINH };
