// Bọc một trang: nếu mã trang đang bị ẩn thì hiện thông báo "không khả dụng" thay cho nội dung. Menu và khung vẫn giữ nguyên.
import { useTrangAn } from '../context/TrangAnContext.jsx';
import TrangKhongKhaDung from '../pages/chung/TrangKhongKhaDung.jsx';

export default function RequireTrang({ ma, children }) {
  const { daTai, timAn } = useTrangAn();
  if (!daTai) return <p className="goi-y" style={{ padding: 24 }}>Đang tải…</p>;
  const an = timAn(ma);
  return an ? <TrangKhongKhaDung lyDo={an.ly_do} /> : children;
}
