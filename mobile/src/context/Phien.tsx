// Phiên đăng nhập: nạp token đã lưu khi mở app, đăng nhập / đăng xuất, tự thoát khi token hết hạn.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, dangKyKhiHetPhien, datToken } from '../api/http';
import { dangNhap as apiDangNhap, toi, type NguoiDung } from '../api/auth';
import { napUrl } from '../api/cau-hinh';
import { doc, ghi, xoa } from '../storage';

type GiaTri = {
  dangNap: boolean; nguoiDung: NguoiDung | null;
  dangNhap: (ten: string, matKhau: string) => Promise<void>;
  dangXuat: () => Promise<void>;
};
const Ctx = createContext<GiaTri | null>(null);
export const usePhien = () => { const c = useContext(Ctx); if (!c) throw new Error('usePhien ngoài PhienProvider'); return c; };

export function PhienProvider({ children }: { children: ReactNode }) {
  const [dangNap, setDangNap] = useState(true);
  const [nguoiDung, setNguoiDung] = useState<NguoiDung | null>(null);

  const dangXuat = useCallback(async () => { datToken(null); setNguoiDung(null); await xoa('token'); }, []);

  useEffect(() => {
    dangKyKhiHetPhien(() => { setNguoiDung(null); xoa('token'); });
    (async () => {
      await napUrl();
      const t = await doc('token');
      if (t) {
        datToken(t);
        try { setNguoiDung(await toi()); }
        catch (e) {
          // Mất mạng: giữ token để lần sau thử lại; 401/403: token hỏng thì bỏ
          if (e instanceof ApiError && (e.status === 401 || e.status === 403)) { datToken(null); await xoa('token'); }
        }
      }
      setDangNap(false);
    })();
  }, []);

  const dangNhap = useCallback(async (ten: string, matKhau: string) => {
    const kq = await apiDangNhap(ten.trim(), matKhau);
    datToken(kq.token); await ghi('token', kq.token); setNguoiDung(kq.nguoi_dung);
  }, []);

  const giaTri = useMemo(() => ({ dangNap, nguoiDung, dangNhap, dangXuat }), [dangNap, nguoiDung, dangNhap, dangXuat]);
  return <Ctx.Provider value={giaTri}>{children}</Ctx.Provider>;
}
