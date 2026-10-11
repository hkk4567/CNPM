// Lưu token, thông tin người dùng, quyền. Khi mở lại trang: có token thì hỏi /auth/toi để khôi phục phiên.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth.api.js';
import { dangKyKhiHetPhien, luuToken } from '../api/http.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [nguoiDung, setNguoiDung] = useState(null);
  const [dangTai, setDangTai] = useState(() => !!luuToken.lay()); // có token thì chờ xác minh trước khi vẽ route

  useEffect(() => {
    dangKyKhiHetPhien(() => setNguoiDung(null));
    if (!luuToken.lay()) return undefined;
    let huy = false;
    authApi.toi()
      .then(u => { if (!huy) setNguoiDung(u); })
      .catch(() => { luuToken.xoa(); })
      .finally(() => { if (!huy) setDangTai(false); });
    return () => { huy = true; };
  }, []);

  const dangNhap = useCallback(async (ten, matKhau) => {
    const kq = await authApi.dangNhap(ten, matKhau);
    luuToken.dat(kq.token);
    setNguoiDung(kq.nguoi_dung);
    return kq.nguoi_dung;
  }, []);

  const dangXuat = useCallback(() => { luuToken.xoa(); setNguoiDung(null); }, []);

  const giaTri = useMemo(() => ({ nguoiDung, dangTai, dangNhap, dangXuat }), [nguoiDung, dangTai, dangNhap, dangXuat]);
  return <AuthContext.Provider value={giaTri}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
