// Màn Lịch làm việc: tab "Lịch tuần" (NS-05..NS-07) và tab "Ca làm việc" (NS-04).
import { Link, Navigate, useParams } from 'react-router-dom';
import LichTuan from './LichTuan.jsx';
import CaLamViecTab from './CaLamViecTab.jsx';

const TAB = [
  { khoa: 'lich-tuan', nhan: 'Lịch tuần', phu: 'Xem ai làm ca nào trong tuần, xếp thêm hoặc gỡ ca', Tab: LichTuan },
  { khoa: 'ca', nhan: 'Ca làm việc', phu: 'Khung giờ các ca trong quán', Tab: CaLamViecTab },
];

export default function LichLamViec() {
  const { tab = 'lich-tuan' } = useParams();
  const hienTai = TAB.find(t => t.khoa === tab);
  if (!hienTai) return <Navigate to="/lich-lam-viec" replace />;
  const { Tab } = hienTai;
  return (
    <>
      <div className="dau-trang"><div><h1>Lịch làm việc</h1><p>{hienTai.phu}</p></div></div>
      <nav className="the-tab" aria-label="Các mục của lịch làm việc">
        {TAB.map(t => <Link key={t.khoa} to={t.khoa === 'lich-tuan' ? '/lich-lam-viec' : `/lich-lam-viec/${t.khoa}`} className={`vien-tab${t.khoa === tab ? ' active' : ''}`} aria-current={t.khoa === tab ? 'page' : undefined}>{t.nhan}</Link>)}
      </nav>
      <Tab key={tab} />
    </>
  );
}
