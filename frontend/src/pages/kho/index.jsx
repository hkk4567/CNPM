// Cụm Kho: /kho (tồn kho), /kho/nguyen-lieu, /kho/lich-su-nhap, /kho/nha-cung-cap. Menu "Nhập hàng" mở thẳng tab lịch sử nhập.
import { Link, Navigate, useParams } from 'react-router-dom';
import TonKhoTab from './TonKhoTab.jsx';
import NguyenLieuTab from './NguyenLieuTab.jsx';
import LichSuNhapTab from './LichSuNhapTab.jsx';
import NccTab from './NccTab.jsx';

const TAB = [
  { khoa: 'ton-kho', nhan: 'Tồn kho', tieuDe: 'Tồn kho', phu: 'Theo dõi tồn và cảnh báo nguyên liệu sắp hết', Tab: TonKhoTab },
  { khoa: 'nguyen-lieu', nhan: 'Nguyên liệu', tieuDe: 'Nguyên liệu', phu: 'Danh mục nguyên liệu và mức tồn tối thiểu', Tab: NguyenLieuTab },
  { khoa: 'lich-su-nhap', nhan: 'Lịch sử nhập', tieuDe: 'Nhập hàng', phu: 'Các phiếu nhập đã lập và tổng tiền nhập', Tab: LichSuNhapTab },
  { khoa: 'nha-cung-cap', nhan: 'Nhà cung cấp', tieuDe: 'Nhà cung cấp', phu: 'Nơi nhập nguyên liệu', Tab: NccTab },
];
const duongDan = k => (k === 'ton-kho' ? '/kho' : `/kho/${k}`);

export default function Kho() {
  const { tab = 'ton-kho' } = useParams();
  const hienTai = TAB.find(t => t.khoa === tab);
  if (!hienTai) return <Navigate to="/kho" replace />;
  const { Tab } = hienTai;
  return (
    <>
      <div className="dau-trang"><div><h1>{hienTai.tieuDe}</h1><p>{hienTai.phu}</p></div></div>
      <nav className="the-tab" aria-label="Các mục của kho">
        {TAB.map(t => <Link key={t.khoa} to={duongDan(t.khoa)} className={`vien-tab${t.khoa === tab ? ' active' : ''}`} aria-current={t.khoa === tab ? 'page' : undefined}>{t.nhan}</Link>)}
      </nav>
      <Tab key={tab} />
    </>
  );
}
