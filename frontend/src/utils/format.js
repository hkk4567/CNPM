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

// ---- Báo cáo ----
const so1 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });
const so2 = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
// Tiền gọn cho trục và nhãn: 0 / 500k / 1,5 tr / 2,3 tỷ
export const tienGon = (n, soLe = 1) => {
  const f = soLe === 2 ? so2 : so1; const a = Math.abs(n);
  if (a >= 1e9) return `${f.format(n / 1e9)} tỷ`;
  if (a >= 1e6) return `${f.format(n / 1e6)} tr`;
  if (a >= 1e3) return `${f.format(n / 1e3)}k`;
  return f.format(n);
};
export const phanTram = n => `${so2.format(n)}%`;
export const dauTien = n => (n < 0 ? `−${tien(-n)}` : tien(n)); // có dấu trừ rõ ràng cho chênh lệch âm
export const dauThangNay = () => `${homNay().slice(0, 8)}01`;

// Nhãn kỳ: ngày 'YYYY-MM-DD' -> 13/10; tuần (thứ Hai) -> 13/10; tháng 'YYYY-MM' -> 10/2026
export const nhanKy = (ky, nhom) => (nhom === 'thang' ? `${ky.slice(5, 7)}/${ky.slice(0, 4)}` : ngayNganGon(ky));
export const nhanKyDai = (ky, nhom) => (nhom === 'thang' ? `Tháng ${nhanKy(ky, nhom)}` : nhom === 'tuan' ? `Tuần ${ngayNganGon(ky)} – ${ngayNganGon(congNgay(ky, 6))}` : `${ngayNganGon(ky)}/${ky.slice(0, 4)}`);
export const kyHienTai = nhom => (nhom === 'thang' ? homNay().slice(0, 7) : nhom === 'tuan' ? thuHaiCua(homNay()) : homNay());

// Danh sách đủ các kỳ từ tu đến den (API chỉ trả kỳ có dữ liệu; điền kỳ trống = 0 để trục thời gian không bị khuyết). null nếu thiếu ngày hoặc quá dài.
export const dayDuKy = (nhom, tu, den, toiDa = 120) => {
  if (!tu || !den || tu > den) return null;
  const ds = [];
  if (nhom === 'thang') {
    let [y, m] = tu.split('-').map(Number); const [y2, m2] = den.split('-').map(Number);
    while (y < y2 || (y === y2 && m <= m2)) { ds.push(`${y}-${hai(m)}`); if (++m > 12) { m = 1; y++; } if (ds.length > toiDa) return null; }
  } else {
    let k = nhom === 'tuan' ? thuHaiCua(tu) : tu;
    while (k <= den) { ds.push(k); k = congNgay(k, nhom === 'tuan' ? 7 : 1); if (ds.length > toiDa) return null; }
  }
  return ds;
};
// Trục số đẹp: trả { max, ticks } với bước 1/2/2.5/5 x 10^k
export const tickDep = (max, soTick = 4) => {
  if (!(max > 0)) return { max: 1, ticks: [0, 1] };
  const tho = max / soTick; const m = 10 ** Math.floor(Math.log10(tho));
  const b = [1, 2, 2.5, 5, 10].map(x => x * m).find(x => x >= tho);
  const dinh = Math.ceil(max / b - 1e-9) * b; const ticks = [];
  for (let i = 0; i * b <= dinh + 1e-9; i++) ticks.push(+(i * b).toFixed(6));
  return { max: dinh, ticks };
};

// Trạng thái hóa đơn / order (POS-10, POS-11)
export const TEN_TRANG_THAI_HD = { dang_pha_che: 'Đang pha chế', da_phuc_vu: 'Đã phục vụ', da_thanh_toan: 'Đã thanh toán', huy: 'Đã hủy' };
export const CHIP_TRANG_THAI_HD = { dang_pha_che: 'chip-warn', da_phuc_vu: 'chip-teal', da_thanh_toan: 'chip-ok', huy: 'chip-off' };
export const gioPhut = s => { const d = new Date(s); return `${hai(d.getHours())}:${hai(d.getMinutes())}`; };
