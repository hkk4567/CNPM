// Định dạng tiền / giờ / chữ không dấu. Tự viết (không dùng Intl) để chạy giống nhau trên Hermes, iOS, Android, web.
export const tien = (n: number) => {
  const v = Math.round(n); const s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${v < 0 ? '−' : ''}${s}đ`;
};
const hai = (n: number) => String(n).padStart(2, '0');
export const gioTuIso = (s: string) => { const d = new Date(s); return `${hai(d.getHours())}:${hai(d.getMinutes())}`; };
export const boDau = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
export const ngayGio = (s: string) => { const d = new Date(s); return `${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()} ${hai(d.getHours())}:${hai(d.getMinutes())}`; };
