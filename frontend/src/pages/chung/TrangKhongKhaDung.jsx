// Thay nội dung trang/tab đang bị ẩn (bảo trì). Lý do lấy từ lệnh: node scripts/an-trang/an-trang.js an <ma> --ly-do "..."
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { useTrangAn } from '../../context/TrangAnContext.jsx';

export default function TrangKhongKhaDung({ lyDo }) {
  const { lamMoi } = useTrangAn();
  const [dang, setDang] = useState(false);
  const kiemTraLai = async () => { setDang(true); try { await lamMoi(); } finally { setDang(false); } };
  return (
    <div className="trang-trong" role="status">
      <Icon ten="oKhoa" size={40} mau="#5B6B69" />
      <h1>Trang này hiện không khả dụng</h1>
      <p>{lyDo}</p>
      <p className="goi-y">Trang sẽ tự mở lại khi được bật trở lại, hoặc bấm “Kiểm tra lại”.</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button type="button" className="btn btn-primary" onClick={kiemTraLai} disabled={dang}>{dang ? 'Đang kiểm tra…' : 'Kiểm tra lại'}</button>
        <Link to="/" className="btn" style={{ textDecoration: 'none', color: 'var(--ink)' }}>Về trang chủ</Link>
      </div>
    </div>
  );
}
