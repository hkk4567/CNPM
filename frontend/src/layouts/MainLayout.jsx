// Khung chính: menu bên trái theo quyền (admin thấy thêm "Tài khoản và quyền"), nội dung bên phải (Outlet).
import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTrangAn } from '../context/TrangAnContext.jsx';
import Icon from '../components/Icon.jsx';
import DoiMatKhau from '../pages/auth/DoiMatKhau.jsx';
import { vienChu } from '../utils/format.js';

const NHOM = [
  { ten: 'Bán hàng', muc: [{ den: '/hoa-don', ma: 'hoa-don', nhan: 'Hóa đơn', icon: 'hoaDon' }] },
  { ten: 'Thực đơn', muc: [{ den: '/san-pham', ma: 'san-pham', nhan: 'Sản phẩm', icon: 'coc' }, { den: '/khuyen-mai', ma: 'khuyen-mai', nhan: 'Khuyến mãi', icon: 'nhan' }] },
  { ten: 'Kho', muc: [{ den: '/kho', ma: 'kho/ton-kho', nhan: 'Tồn kho', icon: 'kho', khop: p => p.startsWith('/kho') && p !== '/kho/lich-su-nhap' }, { den: '/kho/lich-su-nhap', ma: 'kho/lich-su-nhap', nhan: 'Nhập hàng', icon: 'nhap', khop: p => p === '/kho/lich-su-nhap' }] },
  { ten: 'Khách hàng', muc: [{ den: '/khach-hang', ma: 'khach-hang/tra-cuu', nhan: 'Khách hàng', icon: 'khach' }] },
  { ten: 'Nhân sự', muc: [
    { den: '/lich-lam-viec', ma: 'lich-lam-viec/lich-tuan', nhan: 'Lịch làm việc', icon: 'lich' },
    { den: '/nhan-vien', ma: 'nhan-vien', nhan: 'Nhân viên', icon: 'nhanVien' },
    { den: '/tai-khoan', ma: 'tai-khoan', nhan: 'Tài khoản và quyền', icon: 'khoa', chiAdmin: true },
  ] },
  { ten: 'Báo cáo', muc: [{ den: '/bao-cao', ma: 'bao-cao/doanh-thu', nhan: 'Báo cáo', icon: 'baoCao' }] },
];
const TEN_QUYEN = { admin: 'Admin', quan_ly: 'Quản lý', nhan_vien: 'Nhân viên' };

export default function MainLayout() {
  const { nguoiDung, dangXuat } = useAuth();
  const { timAn } = useTrangAn();
  const dieuHuong = useNavigate();
  const [moMenu, setMoMenu] = useState(false);
  const [moDoiMk, setMoDoiMk] = useState(false);
  const viTri = useLocation();
  const [duongTruoc, setDuongTruoc] = useState(viTri.pathname);
  if (duongTruoc !== viTri.pathname) { setDuongTruoc(viTri.pathname); setMoMenu(false); } // chuyển trang thì đóng menu (di động)

  const laAdmin = nguoiDung.quyen_truy_cap === 'admin';

  return (
    <div className="khung">
      <header className="thanh-tren">
        <button type="button" className="icon-btn" aria-label="Mở menu" aria-expanded={moMenu} onClick={() => setMoMenu(true)}><Icon ten="menu" /></button>
        <span>Quản lý quán</span>
      </header>
      <div className={`man-che${moMenu ? ' mo' : ''}`} onClick={() => setMoMenu(false)} />
      <nav className={`menu${moMenu ? ' mo' : ''}`} aria-label="Menu chính">
        <div className="menu-logo"><Icon ten="coc" size={26} mau="#1B6B63" /><span>Quản lý quán</span></div>
        <div className="menu-giua">
          {NHOM.map(n => (
            <div key={n.ten} className="menu-nhom">
              <div className="menu-nhom-ten">{n.ten}</div>
              {n.muc.filter(m => !m.chiAdmin || laAdmin).map(m => {
                const an = timAn(m.ma); // trang đang ẩn: vẫn bấm được, mờ đi + icon khóa, trang sẽ hiện thông báo
                return (
                  <NavLink key={m.den} to={m.den} title={an ? `Không khả dụng: ${an.ly_do}` : undefined} className={({ isActive }) => `menu-muc${(m.khop ? m.khop(viTri.pathname) : isActive) ? ' active' : ''}${an ? ' khoa' : ''}`}>
                    <Icon ten={m.icon} /><span>{m.nhan}</span>
                    {an && <><span className="dau-khoa"><Icon ten="oKhoa" size={16} /></span><span className="sr-only">(không khả dụng)</span></>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>
        <div className="menu-chan">
          <div className="nguoi-dung">
            <div className="avatar" aria-hidden="true">{vienChu(nguoiDung.ho_ten)}</div>
            <div><strong style={{ fontSize: 14 }}>{nguoiDung.ho_ten}</strong><small>{TEN_QUYEN[nguoiDung.quyen_truy_cap]}</small></div>
          </div>
          <div className="menu-nut">
            <button type="button" className="btn" onClick={() => setMoDoiMk(true)}>Đổi mật khẩu</button>
            <button type="button" className="btn" onClick={() => { dangXuat(); dieuHuong('/dang-nhap', { replace: true }); }}>Đăng xuất</button>
          </div>
        </div>
      </nav>
      <main className="noi-dung"><Outlet /></main>
      {moDoiMk && <DoiMatKhau onDong={() => setMoDoiMk(false)} />}
    </div>
  );
}
