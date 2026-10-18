// Khai báo route theo module. Màn nào làm xong thì thay ChuaLam bằng trang thật.
import { Navigate, Route, Routes } from 'react-router-dom';
import RequireRole from './RequireRole.jsx';
import RequireTrang from './RequireTrang.jsx';
import MainLayout from '../layouts/MainLayout.jsx';
import DangNhap from '../pages/auth/index.jsx';
import SanPham from '../pages/san-pham/index.jsx';
import Kho from '../pages/kho/index.jsx';
import KhuyenMai from '../pages/khuyen-mai/index.jsx';
import KhachHang from '../pages/khach-hang/index.jsx';
import LichLamViec from '../pages/nhan-su/LichLamViec.jsx';
import NhanVien from '../pages/nhan-su/NhanVien.jsx';
import TaiKhoan from '../pages/nhan-su/TaiKhoan.jsx';
import HoaDon from '../pages/hoa-don/index.jsx';
import BaoCao from '../pages/bao-cao/index.jsx';
import KhongCoQuyen from '../pages/chung/KhongCoQuyen.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const QUAN_TRI = ['admin', 'quan_ly'];
// Bọc trang bằng RequireTrang: trang đang bị ẩn (scripts/an-trang/an-trang.js) thì hiện thông báo không khả dụng. Tab ẩn riêng xử lý trong từng trang.
const T = (ma, trang) => <RequireTrang ma={ma}>{trang}</RequireTrang>;

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
          <Route path="/hoa-don" element={T('hoa-don', <HoaDon />)} />
          <Route path="/san-pham" element={T('san-pham', <SanPham />)} />
          <Route path="/khuyen-mai" element={T('khuyen-mai', <KhuyenMai />)} />
          <Route path="/kho/:tab?" element={T('kho', <Kho />)} />
          <Route path="/nhap-hang" element={<Navigate to="/kho/lich-su-nhap" replace />} />
          <Route path="/khach-hang/:tab?" element={T('khach-hang', <KhachHang />)} />
          <Route path="/lich-lam-viec/:tab?" element={T('lich-lam-viec', <LichLamViec />)} />
          <Route path="/nhan-vien" element={T('nhan-vien', <NhanVien />)} />
          <Route path="/bao-cao/:tab?" element={T('bao-cao', <BaoCao />)} />
        </Route>
      </Route>
      <Route element={<RequireRole quyen={['admin']} />}>
        <Route element={<MainLayout />}>
          <Route path="/tai-khoan" element={T('tai-khoan', <TaiKhoan />)} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
