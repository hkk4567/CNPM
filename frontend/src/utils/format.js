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
