// KM-07: hiệu quả của khuyến mãi (chỉ tính hóa đơn đã thanh toán), lọc theo ngày thanh toán.
import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { baoCaoKhuyenMai } from '../../api/khuyen-mai.api.js';
import { soThuong, tien } from '../../utils/format.js';
import { thongBaoLoi } from '../../utils/loi.js';

export default function HieuQua({ ma }) {
  const [tu, setTu] = useState('');
  const [den, setDen] = useState('');
  const sai = tu && den && tu > den;
  const bc = useApi(() => baoCaoKhuyenMai(ma, { tu_ngay: tu, den_ngay: den }), [ma, sai ? '' : tu, sai ? '' : den]);
  const r = bc.data;
  const o = (nhan, giaTri) => <div className="so-lieu"><span>{nhan}</span><strong>{giaTri}</strong></div>;

  return (
    <section className="truong" aria-label="Hiệu quả khuyến mãi">
      <span className="nhan">Hiệu quả (hóa đơn đã thanh toán)</span>
      <div className="cong-thuc-dong">
        <input className="o-nhap" type="date" aria-label="Từ ngày" value={tu} onChange={e => setTu(e.target.value)} />
        <input className="o-nhap" type="date" aria-label="Đến ngày" value={den} onChange={e => setDen(e.target.value)} />
      </div>
      {sai && <span className="loi-truong">“Từ ngày” đang sau “Đến ngày”.</span>}
      {bc.error && <div className="banner banner-loi" role="alert">{thongBaoLoi(bc.error)}</div>}
      {r && !sai && (
        <div className="luoi-so-lieu" aria-busy={bc.loading}>
          {o('Số hóa đơn', soThuong(r.so_hoa_don))}
          {o('Số ly áp mã', soThuong(r.so_luong_ban))}
          {o('Tiền đã giảm', tien(r.tong_tien_giam))}
          {o('Doanh thu sau giảm', tien(r.doanh_thu_sau_giam))}
        </div>
      )}
      <p className="goi-y">Để trống ngày = tính từ trước đến nay. “Tiền đã giảm” chỉ tính phần giảm của riêng khuyến mãi này.</p>
    </section>
  );
}
