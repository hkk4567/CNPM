// Tải dữ liệu bất đồng bộ: dữ liệu, trạng thái tải, lỗi, tải lại (kéo để làm mới).
// `khoa` đổi (ví dụ đổi tuần) hoặc gọi taiLai/lamMoi thì tải lại; kết quả của lần gọi cũ bị bỏ.
import { useEffect, useRef, useState } from 'react';
import { thongBaoLoi } from '../api/http';

export function useTai<T>(tai: () => Promise<T>, khoa: string) {
  const [duLieu, setDuLieu] = useState<T | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const [dangLamMoi, setDangLamMoi] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [lan, setLan] = useState(0);
  const taiRef = useRef(tai);
  useEffect(() => { taiRef.current = tai; });

  // Đổi khóa: đặt lại trạng thái ngay lúc render (không setState trong effect)
  const [khoaCu, setKhoaCu] = useState(khoa);
  if (khoa !== khoaCu) { setKhoaCu(khoa); setDangTai(true); setLoi(null); }

  useEffect(() => {
    let boQua = false;
    taiRef.current().then(
      (kq) => { if (!boQua) { setDuLieu(kq); setLoi(null); } },
      (e) => { if (!boQua) setLoi(thongBaoLoi(e)); },
    ).finally(() => { if (!boQua) { setDangTai(false); setDangLamMoi(false); } });
    return () => { boQua = true; };
  }, [khoa, lan]);

  return {
    duLieu, dangTai, dangLamMoi, loi,
    taiLai: () => { setDangTai(true); setLoi(null); setLan((n) => n + 1); },
    lamMoi: () => { setDangLamMoi(true); setLan((n) => n + 1); },
    taiNgam: () => setLan((n) => n + 1), // tải lại không hiện vòng xoay (khi quay lại màn)
  };
}
