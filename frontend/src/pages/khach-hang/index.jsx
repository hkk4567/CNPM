// Màn Khách hàng: tab "Tra cứu" (KH-01..KH-04) và tab "Khách thân thiết" (KH-05). Menu chỉ có một mục /khach-hang.
import { Link, Navigate, useParams } from 'react-router-dom';
import TraCuuTab from './TraCuuTab.jsx';
import ThanThietTab from './ThanThietTab.jsx';

const TAB = [
  { khoa: 'tra-cuu', nhan: 'Tra cứu', phu: 'Tìm khách theo tên hoặc số điện thoại, sửa thông tin và xem lịch sử mua', Tab: TraCuuTab },
  { khoa: 'than-thiet', nhan: 'Khách thân thiết', phu: 'Xếp hạng khách theo tổng chi tiêu', Tab: ThanThietTab },
];

export default function KhachHang() {
  const { tab = 'tra-cuu' } = useParams();
  const hienTai = TAB.find(t => t.khoa === tab);
  if (!hienTai) return <Navigate to="/khach-hang" replace />;
  const { Tab } = hienTai;
  return (
    <>
      <div className="dau-trang"><div><h1>Khách hàng</h1><p>{hienTai.phu}</p></div></div>
      <nav className="the-tab" aria-label="Các mục của khách hàng">
        {TAB.map(t => <Link key={t.khoa} to={t.khoa === 'tra-cuu' ? '/khach-hang' : `/khach-hang/${t.khoa}`} className={`vien-tab${t.khoa === tab ? ' active' : ''}`} aria-current={t.khoa === tab ? 'page' : undefined}>{t.nhan}</Link>)}
      </nav>
      <Tab key={tab} />
    </>
  );
}
