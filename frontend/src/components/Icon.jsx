// Icon nét đơn giản (cùng bộ với bản mẫu giao diện). Dùng: <Icon ten="kho" />.
const D = {
  coc: 'M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z M16 10h2a2 2 0 0 1 0 4h-2 M7 3v2 M11 3v2',
  nhan: 'M3 12V4h8l9 9-8 8-9-9z M7.5 8.5h.01',
  kho: 'M3 7l9-4 9 4v10l-9 4-9-4V7z M3 7l9 4 9-4 M12 11v10',
  nhap: 'M12 3v12 M7 10l5 5 5-5 M4 20h16',
  khach: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0',
  lich: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
  nhanVien: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M2 20a7 7 0 0 1 14 0 M17 4.5a3.5 3.5 0 0 1 0 6.5 M19 14a7 7 0 0 1 3 6',
  khoa: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
  baoCao: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2',
  tim: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-4-4',
  menu: 'M4 7h16 M4 12h16 M4 17h16',
  xoa: 'M6 6l12 12 M18 6L6 18',
};

export default function Icon({ ten, size = 20, mau = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={mau} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={D[ten]} />
    </svg>
  );
}
