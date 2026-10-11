// Hiện khi tài khoản không đủ quyền vào phần quản lý (ví dụ nhân viên: giao diện bán hàng làm ở bước sau).
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function KhongCoQuyen() {
  const { nguoiDung, dangXuat } = useAuth();
  const dieuHuong = useNavigate();
  return (
    <div className="toan-man">
      <div className="trang-trong">
        <h1>Chưa có giao diện cho tài khoản này</h1>
        <p>
          {nguoiDung?.quyen_truy_cap === 'nhan_vien'
            ? 'Giao diện bán hàng cho nhân viên sẽ được làm ở bước sau. Hiện chỉ admin và quản lý dùng được phần quản lý.'
            : 'Tài khoản của bạn không có quyền vào trang này.'}
        </p>
        <button type="button" className="btn btn-primary" onClick={() => { dangXuat(); dieuHuong('/dang-nhap', { replace: true }); }}>Đăng xuất</button>
      </div>
    </div>
  );
}
