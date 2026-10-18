// Dùng trong các trang có thanh tab (kho, khách hàng, lịch làm việc, báo cáo).
// VienTab: nút tab; tab đang ẩn thì mờ đi + icon khóa nhưng vẫn bấm được. NoiDungTab: hiện thông báo thay cho nội dung tab đang ẩn.
import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import TrangKhongKhaDung from '../pages/chung/TrangKhongKhaDung.jsx';
import { useTrangAn } from '../context/TrangAnContext.jsx';

export function VienTab({ ma, to, dangChon, children }) {
  const { timAn } = useTrangAn();
  const an = timAn(ma);
  return (
    <Link to={to} className={`vien-tab${dangChon ? ' active' : ''}${an ? ' khoa' : ''}`} aria-current={dangChon ? 'page' : undefined} title={an ? `Không khả dụng: ${an.ly_do}` : undefined}>
      {children}
      {an && <><span className="dau-khoa"><Icon ten="oKhoa" size={14} /></span><span className="sr-only"> (không khả dụng)</span></>}
    </Link>
  );
}

export function NoiDungTab({ ma, children }) {
  const { daTai, timAn } = useTrangAn();
  if (!daTai) return <p className="goi-y">Đang tải…</p>;
  const an = timAn(ma);
  return an ? <TrangKhongKhaDung lyDo={an.ly_do} /> : children;
}
