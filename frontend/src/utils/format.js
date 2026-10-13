// Định dạng tiền, số, ngày giờ theo kiểu Việt Nam
const so = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 });

export const soThuong = n => so.format(Number(n));
export const tien = n => `${so.format(Math.round(Number(n)))}đ`;
export const ngayGio = s => (s ? new Date(s).toLocaleString('vi-VN') : '');
export const ngay = s => (s ? new Date(s).toLocaleDateString('vi-VN') : '');
// "Cà phê" -> "CP" (viền chữ cái cho avatar)
export const vienChu = ten => (ten || '').split(/\s+/).filter(Boolean).slice(-2).map(t => t[0].toUpperCase()).join('');

// ISO (từ API) <-> giá trị của <input type="datetime-local"> theo giờ máy người dùng
const hai = n => String(n).padStart(2, '0');
export const sangOGioNhap = iso => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${hai(d.getMonth() + 1)}-${hai(d.getDate())}T${hai(d.getHours())}:${hai(d.getMinutes())}`;
};
export const tuOGioNhap = v => new Date(v).toISOString();
// "20/10 08:00": gọn cho bảng
export const ngayGioNgan = s => {
  const d = new Date(s);
  return `${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()} ${hai(d.getHours())}:${hai(d.getMinutes())}`;
};

// Nhãn phương thức thanh toán (dùng ở lịch sử mua, báo cáo)
export const PHUONG_THUC = { tien_mat: 'Tiền mặt', chuyen_khoan: 'Chuyển khoản', vi: 'Ví điện tử' };
// Ngày hôm nay dạng YYYY-MM-DD theo giờ máy (mặc định cho ô lọc ngày)
export const homNay = () => { const d = new Date(); return `${d.getFullYear()}-${hai(d.getMonth() + 1)}-${hai(d.getDate())}`; };

// ---- Nhân sự ----
export const TEN_QUYEN = { admin: 'Admin', quan_ly: 'Quản lý', nhan_vien: 'Nhân viên' };
export const THU_NGAN = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
export const gioNgan = s => (s || '').slice(0, 5); // "06:00:00" -> "06:00"
// Ngày dạng YYYY-MM-DD <-> Date theo giờ máy (dựng ở 12:00 để cộng ngày không lệch do giờ mùa hè)
const dungNgay = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const chuoiNgay = d => `${d.getFullYear()}-${hai(d.getMonth() + 1)}-${hai(d.getDate())}`;
export const congNgay = (s, n) => { const d = dungNgay(s); d.setDate(d.getDate() + n); return chuoiNgay(d); };
export const thuHaiCua = s => { const d = dungNgay(s); return congNgay(s, -((d.getDay() + 6) % 7)); }; // thứ Hai của tuần chứa ngày s
export const ngayNganGon = s => { const [, m, d] = s.split('-'); return `${d}/${m}`; }; // "2026-10-13" -> "13/10"
