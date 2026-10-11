// Trang đăng nhập (AUTH-01). Đổi mật khẩu (AUTH-02) nằm ở DoiMatKhau.jsx, mở từ menu.
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { thongBaoLoi } from '../../utils/loi.js';

export default function DangNhap() {
  const { nguoiDung, dangNhap } = useAuth();
  const dieuHuong = useNavigate();
  const viTri = useLocation();
  const [ten, setTen] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [loi, setLoi] = useState('');
  const [dangGui, setDangGui] = useState(false);

  if (nguoiDung) return <Navigate to="/" replace />;

  async function gui(e) {
    e.preventDefault();
    if (!ten.trim() || !matKhau) { setLoi('Nhập tên đăng nhập và mật khẩu'); return; }
    setDangGui(true); setLoi('');
    try {
      await dangNhap(ten.trim(), matKhau);
      dieuHuong(viTri.state?.tu || '/', { replace: true });
    } catch (err) {
      setLoi(thongBaoLoi(err));
      setDangGui(false);
    }
  }

  return (
    <AuthLayout>
      <form className="dn-form" onSubmit={gui} noValidate>
        <div>
          <h1>Đăng nhập</h1>
          <p className="goi-y">Dùng tài khoản do admin cấp cho bạn.</p>
        </div>
        {loi && <div className="banner banner-loi" role="alert">{loi}</div>}
        <div className="truong">
          <label htmlFor="ten">Tên đăng nhập</label>
          <input id="ten" className="o-nhap o-nhap-lon" type="text" autoComplete="username" autoFocus value={ten} onChange={e => setTen(e.target.value)} />
        </div>
        <div className="truong">
          <label htmlFor="mk">Mật khẩu</label>
          <input id="mk" className="o-nhap o-nhap-lon" type="password" autoComplete="current-password" value={matKhau} onChange={e => setMatKhau(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary btn-block" style={{ minHeight: 48, fontSize: 16 }} disabled={dangGui}>
          {dangGui ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
        <p className="goi-y">Quên mật khẩu? Nhờ admin đặt lại cho bạn.</p>
      </form>
    </AuthLayout>
  );
}
