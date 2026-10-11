// Khung trang đăng nhập: bên trái hoạ tiết gạch bông, bên phải là form (children).
import Icon from '../components/Icon.jsx';

export default function AuthLayout({ children }) {
  return (
    <div className="dang-nhap">
      <div className="dn-trai">
        <svg className="hoa-van" aria-hidden="true">
          <defs>
            <pattern id="gachbong" width="96" height="96" patternUnits="userSpaceOnUse">
              <rect width="96" height="96" fill="#1B6B63" />
              <path d="M0 0H48A48 48 0 0 1 0 48Z" fill="#E4EFEC" />
              <path d="M96 0V48A48 48 0 0 1 48 0Z" fill="#14524C" />
              <path d="M96 96H48A48 48 0 0 1 96 48Z" fill="#E4EFEC" />
              <path d="M0 96V48A48 48 0 0 1 48 96Z" fill="#14524C" />
              <path d="M48 34L62 48L48 62L34 48Z" fill="#E2A92C" />
              <circle cx="48" cy="48" r="5" fill="#1B6B63" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gachbong)" />
        </svg>
        <div className="dn-nhan"><Icon ten="coc" size={24} mau="#1B6B63" /><span>Quản lý quán</span></div>
      </div>
      <div className="dn-phai">{children}</div>
    </div>
  );
}
