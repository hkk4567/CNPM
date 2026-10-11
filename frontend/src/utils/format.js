// Định dạng tiền, số, ngày giờ theo kiểu Việt Nam
const so = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 });

export const soThuong = n => so.format(Number(n));
export const tien = n => `${so.format(Math.round(Number(n)))}đ`;
export const ngayGio = s => (s ? new Date(s).toLocaleString('vi-VN') : '');
export const ngay = s => (s ? new Date(s).toLocaleDateString('vi-VN') : '');
// "Cà phê" -> "CP" (viền chữ cái cho avatar)
export const vienChu = ten => (ten || '').split(/\s+/).filter(Boolean).slice(-2).map(t => t[0].toUpperCase()).join('');
