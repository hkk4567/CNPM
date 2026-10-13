// Màn Báo cáo (BC-01..BC-06): 6 tab, một hàng bộ lọc chung phía trên (áp cho mọi số liệu bên dưới), bấm "Xem báo cáo" mới tải lại.
// Bộ lọc nằm ở đây (không ở từng tab) nên đổi tab vẫn giữ nguyên khoảng ngày.
import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import DoanhThu from './DoanhThu.jsx';
import ChiPhiDoanhThu from './ChiPhiDoanhThu.jsx';
import XepHang, { CAU_HINH } from './XepHang.jsx';
import { dauThangNay, homNay } from '../../utils/format.js';

const TAB = [
  { khoa: 'doanh-thu', nhan: 'Doanh thu', nhom: true, Tab: DoanhThu },
  { khoa: 'san-pham', nhan: 'Sản phẩm bán chạy', top: true, Tab: XepHang, cauHinh: 'san-pham' },
  { khoa: 'danh-muc', nhan: 'Theo danh mục', Tab: XepHang, cauHinh: 'danh-muc' },
  { khoa: 'thanh-toan', nhan: 'Phương thức thanh toán', Tab: XepHang, cauHinh: 'thanh-toan' },
  { khoa: 'chi-phi', nhan: 'Chi phí nhập và doanh thu', nhom: true, Tab: ChiPhiDoanhThu },
  { khoa: 'nhan-vien', nhan: 'Theo nhân viên', Tab: XepHang, cauHinh: 'nhan-vien' },
];

export default function BaoCao() {
  const { tab = 'doanh-thu' } = useParams();
  const hienTai = TAB.find(t => t.khoa === tab);
  const [nhap, setNhap] = useState(() => ({ tu: dauThangNay(), den: homNay(), nhom: 'ngay', top: '10' })); // ô đang gõ
  const [ap, setAp] = useState(nhap);                                                                   // bộ lọc đã bấm "Xem báo cáo"
  if (!hienTai) return <Navigate to="/bao-cao" replace />;
  const sai = nhap.tu && nhap.den && nhap.tu > nhap.den;
  const dat = k => e => setNhap(x => ({ ...x, [k]: e.target.value }));
  const loc = { tu_ngay: ap.tu, den_ngay: ap.den, nhom: ap.nhom, top: ap.top };
  const { Tab } = hienTai;

  return (
    <>
      <div className="dau-trang"><div><h1>Báo cáo</h1><p>Chỉ tính các hóa đơn đã thanh toán, theo ngày thanh toán.</p></div></div>

      <nav className="the-tab" aria-label="Các báo cáo">
        {TAB.map(t => <Link key={t.khoa} to={t.khoa === 'doanh-thu' ? '/bao-cao' : `/bao-cao/${t.khoa}`} className={`vien-tab${t.khoa === tab ? ' active' : ''}`} aria-current={t.khoa === tab ? 'page' : undefined}>{t.nhan}</Link>)}
      </nav>

      <form className="bo-loc bo-loc-bc" onSubmit={e => { e.preventDefault(); if (!sai) setAp(nhap); }} noValidate>
        <div className="truong"><label htmlFor="bc-tu">Từ ngày</label><input id="bc-tu" className="o-nhap" type="date" value={nhap.tu} onChange={dat('tu')} aria-invalid={!!sai} /></div>
        <div className="truong"><label htmlFor="bc-den">Đến ngày</label><input id="bc-den" className="o-nhap" type="date" value={nhap.den} onChange={dat('den')} aria-invalid={!!sai} /></div>
        {hienTai.nhom && (
          <fieldset className="truong" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="nhan" style={{ padding: 0, marginBottom: 8 }}>Gom theo</legend>
            <div className="nhom-radio-dong">
              {[['ngay', 'Ngày'], ['tuan', 'Tuần'], ['thang', 'Tháng']].map(([v, t]) => <label key={v}><input type="radio" name="bc-nhom" value={v} checked={nhap.nhom === v} onChange={dat('nhom')} />{t}</label>)}
            </div>
          </fieldset>
        )}
        {hienTai.top && (
          <div className="truong">
            <label htmlFor="bc-top">Hiển thị</label>
            <select id="bc-top" className="o-nhap" value={nhap.top} onChange={dat('top')}>{['5', '10', '20', '50'].map(n => <option key={n} value={n}>Top {n}</option>)}</select>
          </div>
        )}
        <button type="submit" className="btn btn-primary" disabled={!!sai}>Xem báo cáo</button>
      </form>
      {sai && <div className="banner banner-loi" role="alert">“Từ ngày” đang sau “Đến ngày”.</div>}
      <p className="goi-y" style={{ marginTop: -8 }}>Để trống một hoặc cả hai ngày = không giới hạn đầu đó.</p>

      <Tab key={tab} loc={loc} cauHinh={hienTai.cauHinh ? CAU_HINH[hienTai.cauHinh] : undefined} />
    </>
  );
}
