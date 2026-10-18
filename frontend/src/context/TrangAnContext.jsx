// Giữ danh sách trang/tab đang bị ẩn (do scripts/an-trang/an-trang.js ghi). Tải sau khi đăng nhập, rồi tải lại khi đổi trang,
// khi tab trình duyệt hiện lại, và mỗi CHU_KY_MS. Lỗi mạng thì giữ nguyên danh sách cũ (không tự ý ẩn/hiện).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { trangAn as apiTrangAn } from '../api/he-thong.api.js';
import { timTrangAn } from '../utils/trang-an.js';

export const CHU_KY_MS = 30000;
const TrangAnContext = createContext({ daTai: true, timAn: () => null, lamMoi: async () => {} });

export function TrangAnProvider({ children }) {
  const { nguoiDung } = useAuth();
  const dangNhap = !!nguoiDung;
  const { pathname } = useLocation();
  const [trangAn, setTrangAn] = useState({});
  const [daTai, setDaTai] = useState(false); // chưa tải xong lần đầu thì chưa vẽ trang, tránh nháy nội dung của trang đang ẩn
  const lanGoi = useRef(0);

  const lamMoi = useCallback(async () => {
    const lan = ++lanGoi.current;
    try {
      const d = await apiTrangAn();
      if (lan !== lanGoi.current) return; // đã có lần gọi mới hơn
      const moi = d?.trang_an ?? {};
      setTrangAn(cu => (JSON.stringify(cu) === JSON.stringify(moi) ? cu : moi));
    } catch { /* giữ nguyên danh sách cũ */ }
    if (lan === lanGoi.current) setDaTai(true);
  }, []);

  useEffect(() => {
    if (!dangNhap) { lanGoi.current++; setTrangAn({}); setDaTai(false); return undefined; }
    const t = setInterval(lamMoi, CHU_KY_MS);
    const khiHienLai = () => { if (document.visibilityState === 'visible') lamMoi(); };
    document.addEventListener('visibilitychange', khiHienLai);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', khiHienLai); };
  }, [dangNhap, lamMoi]);

  useEffect(() => { if (dangNhap) lamMoi(); }, [dangNhap, pathname, lamMoi]); // lần đầu sau đăng nhập và mỗi lần đổi trang

  const giaTri = useMemo(() => ({ daTai, timAn: ma => timTrangAn(trangAn, ma), lamMoi }), [daTai, trangAn, lamMoi]);
  return <TrangAnContext.Provider value={giaTri}>{children}</TrangAnContext.Provider>;
}

export const useTrangAn = () => useContext(TrangAnContext);
