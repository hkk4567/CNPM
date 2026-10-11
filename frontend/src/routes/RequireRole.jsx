// Chặn route theo quyền: chưa đăng nhập -> /dang-nhap; sai quyền -> /khong-co-quyen. Đúng quyền thì vẽ route con (Outlet).
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function RequireRole({ quyen }) {
  const { nguoiDung, dangTai } = useAuth();
  const viTri = useLocation();
  if (dangTai) return <div className="toan-man">Đang tải…</div>;
  if (!nguoiDung) return <Navigate to="/dang-nhap" replace state={{ tu: viTri.pathname }} />;
  if (!quyen.includes(nguoiDung.quyen_truy_cap)) return <Navigate to="/khong-co-quyen" replace />;
  return <Outlet />;
}
