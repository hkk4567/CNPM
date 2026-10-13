// KH-05: top khách thân thiết theo tổng chi tiêu (hóa đơn đã thanh toán), lọc theo ngày thanh toán. Bỏ khách vãng lai.
import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import DataTable from '../../components/DataTable.jsx';
import { topKhach } from '../../api/khach-hang.api.js';
import { soThuong, tien } from '../../utils/format.js';
import { thongBaoLoi } from '../../utils/loi.js';

export default function ThanThietTab() {
  const [loc, setLoc] = useState({ tu_ngay: '', den_ngay: '', top: '10' });
  const sai = loc.tu_ngay && loc.den_ngay && loc.tu_ngay > loc.den_ngay;
  const ds = useApi(() => topKhach({ ...loc }), sai ? [] : [loc.tu_ngay, loc.den_ngay, loc.top]);
  const dong = (ds.data ?? []).map((d, i) => ({ ...d, hang: i + 1 }));
  const doi = k => e => setLoc(l => ({ ...l, [k]: e.target.value }));

  const cot = [
    { khoa: 'hang', tieuDe: 'Hạng', hienThi: d => <strong>{d.hang}</strong> },
    { khoa: 'ten', tieuDe: 'Khách hàng', hienThi: d => <strong>{d.ten}</strong> },
    { khoa: 'so_dien_thoai', tieuDe: 'Số điện thoại' },
    { khoa: 'so_don', tieuDe: 'Số đơn', canPhai: true, hienThi: d => soThuong(d.so_don) },
    { khoa: 'tong_chi_tieu', tieuDe: 'Tổng chi tiêu', canPhai: true, hienThi: d => <strong>{tien(d.tong_chi_tieu)}</strong> },
  ];

  return (
    <>
      <div className="bo-loc">
        <div className="truong"><label htmlFor="tt-tu">Từ ngày</label><input id="tt-tu" className="o-nhap" type="date" value={loc.tu_ngay} onChange={doi('tu_ngay')} /></div>
        <div className="truong"><label htmlFor="tt-den">Đến ngày</label><input id="tt-den" className="o-nhap" type="date" value={loc.den_ngay} onChange={doi('den_ngay')} /></div>
        <div className="truong">
          <label htmlFor="tt-top">Hiển thị</label>
          <select id="tt-top" className="o-nhap" value={loc.top} onChange={doi('top')}>
            {['5', '10', '20', '50'].map(n => <option key={n} value={n}>Top {n}</option>)}
          </select>
        </div>
      </div>
      {sai && <div className="banner banner-loi" role="alert">“Từ ngày” đang sau “Đến ngày”.</div>}
      {ds.error && <div className="banner banner-loi" role="alert"><span>{thongBaoLoi(ds.error)}</span><button type="button" className="link-nut" onClick={ds.reload}>Thử lại</button></div>}
      <div className="the">
        <DataTable tenBang="Khách thân thiết" cot={cot} dong={dong} khoaDong="ma_khach_hang" dangTai={ds.loading} trong="Chưa có khách nào thanh toán trong khoảng này" />
        <div className="chu-thich">Xếp theo tổng chi tiêu, đồng hạng thì ưu tiên nhiều đơn hơn. Khách vãng lai (không có số điện thoại) không được tính.</div>
      </div>
    </>
  );
}
