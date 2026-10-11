// Khai báo route theo module. Màn nào làm xong thì thay ChuaLam bằng trang thật.
import { Navigate, Route, Routes } from 'react-router-dom';
import RequireRole from './RequireRole.jsx';
import MainLayout from '../layouts/MainLayout.jsx';
import DangNhap from '../pages/auth/index.jsx';
import SanPham from '../pages/san-pham/index.jsx';
import Kho from '../pages/kho/index.jsx';
import KhuyenMai from '../pages/khuyen-mai/index.jsx';
import ChuaLam from '../pages/chung/ChuaLam.jsx';
import KhongCoQuyen from '../pages/chung/KhongCoQuyen.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const QUAN_TRI = ['admin', 'quan_ly'];

function TrangChu() {
  const { nguoiDung, dangTai } = useAuth();
  if (dangTai) return <div className="toan-man">Đang tải…</div>;
  if (!nguoiDung) return <Navigate to="/dang-nhap" replace />;
  return <Navigate to={QUAN_TRI.includes(nguoiDung.quyen_truy_cap) ? '/san-pham' : '/khong-co-quyen'} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<TrangChu />} />
      <Route path="/dang-nhap" element={<DangNhap />} />
      <Route path="/khong-co-quyen" element={<KhongCoQuyen />} />
      <Route element={<RequireRole quyen={QUAN_TRI} />}>
        <Route element={<MainLayout />}>
          <Route path="/san-pham" element={<SanPham />} />
          <Route path="/khuyen-mai" element={<KhuyenMai />} />
          <Route path="/kho/:tab?" element={<Kho />} />
          <Route path="/nhap-hang" element={<Navigate to="/kho/lich-su-nhap" replace />} />
          <Route path="/khach-hang" element={<ChuaLam ten="Khách hàng" ma="KH-01..05" />} />
          <Route path="/lich-lam-viec" element={<ChuaLam ten="Lịch làm việc" ma="NS" />} />
          <Route path="/nhan-vien" element={<ChuaLam ten="Nhân viên" ma="NS" />} />
          <Route path="/bao-cao" element={<ChuaLam ten="Báo cáo" ma="BC-01..06" />} />
        </Route>
      </Route>
      <Route element={<RequireRole quyen={['admin']} />}>
        <Route element={<MainLayout />}>
          <Route path="/tai-khoan" element={<ChuaLam ten="Tài khoản và quyền" ma="NS" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
