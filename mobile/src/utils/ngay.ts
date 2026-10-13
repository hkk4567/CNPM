// Ngày giờ theo giờ máy điện thoại. Ngày dạng YYYY-MM-DD (khớp API); dựng ở 12:00 để cộng ngày không lệch do giờ mùa hè.
export const THU_NGAN = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const hai = (n: number) => String(n).padStart(2, '0');
const dung = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const chuoi = (d: Date) => `${d.getFullYear()}-${hai(d.getMonth() + 1)}-${hai(d.getDate())}`;

export const homNay = () => chuoi(new Date());
export const congNgay = (s: string, n: number) => { const d = dung(s); d.setDate(d.getDate() + n); return chuoi(d); };
export const thuHaiCua = (s: string) => congNgay(s, -((dung(s).getDay() + 6) % 7)); // thứ Hai của tuần chứa ngày s
export const ngayNgan = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;           // 2026-10-13 -> 13/10
export const gioNgan = (s: string) => s.slice(0, 5);                                    // 06:00:00 -> 06:00
export const phutTrongNgay = (d = new Date()) => d.getHours() * 60 + d.getMinutes();
export const gioSangPhut = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
export const thuCuaNgay = (s: string) => THU_NGAN[(dung(s).getDay() + 6) % 7];
