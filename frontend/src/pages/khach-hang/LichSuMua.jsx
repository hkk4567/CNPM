// KH-04: lịch sử mua của một khách (hóa đơn đã thanh toán), lọc theo ngày thanh toán, phân trang.
// Tổng chi tiêu và số đơn do API tính trên toàn bộ kết quả lọc, không chỉ trang đang xem.
import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { lichSuMua } from '../../api/khach-hang.api.js';
import { PHUONG_THUC, ngayGioNgan, soThuong, tien } from '../../utils/format.js';
import { thongBaoLoi } from '../../utils/loi.js';

const MOI_TRANG = 5;

export default function LichSuMua({ ma }) {
  const [tu, setTu] = useState('');
  const [den, setDen] = useState('');
  const [trang, setTrang] = useState(1);
  const sai = tu && den && tu > den;
  const ls = useApi(() => lichSuMua(ma, { tu_ngay: tu, den_ngay: den, trang, moi_trang: MOI_TRANG }), [ma, sai ? '' : tu, sai ? '' : den, trang]);
  const r = ls.data;
  const tong = r?.tong_so_ban_ghi ?? 0;
  const tongTrang = Math.max(1, Math.ceil(tong / MOI_TRANG));
  const doi = setter => e => { setter(e.target.value); setTrang(1); };

  return (
    <section className="truong" aria-label="Lịch sử mua">
      <span className="nhan">Lịch sử mua (hóa đơn đã thanh toán)</span>
      <div className="cong-thuc-dong">
        <input className="o-nhap" type="date" aria-label="Từ ngày" value={tu} onChange={doi(setTu)} />
        <input className="o-nhap" type="date" aria-label="Đến ngày" value={den} onChange={doi(setDen)} />
      </div>
      {sai && <span className="loi-truong">“Từ ngày” đang sau “Đến ngày”.</span>}
      {ls.error && <div className="banner banner-loi" role="alert">{thongBaoLoi(ls.error)}</div>}
      {r && !sai && (
        <div aria-busy={ls.loading} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="luoi-so-lieu">
            <div className="so-lieu"><span>Số đơn</span><strong>{soThuong(tong)}</strong></div>
            <div className="so-lieu"><span>Tổng chi tiêu</span><strong>{tien(r.tong_chi_tieu)}</strong></div>
          </div>
          {r.data.length === 0
            ? <p className="goi-y">Chưa có hóa đơn nào trong khoảng này.</p>
            : (
              <ul className="ds-doc">
                {r.data.map(h => (
                  <li key={h.ma_hoa_don}>
                    <span>
                      <strong>Hóa đơn #{h.so_thu_tu}</strong><br />
                      <span className="goi-y">{ngayGioNgan(h.thoi_gian_thanh_toan)} · {PHUONG_THUC[h.phuong_thuc_thanh_toan] ?? h.phuong_thuc_thanh_toan}</span>
                    </span>
                    <span style={{ textAlign: 'right' }}>
                      <strong>{tien(h.tong_tien)}</strong><br />
                      <span className="goi-y">{h.diem_cong > 0 ? `+${soThuong(h.diem_cong)} điểm` : 'Không cộng điểm'}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          {tong > MOI_TRANG && (
            <div className="hang-dau">
              <span className="goi-y">Trang {trang} / {tongTrang}</span>
              <div className="hang-nut" style={{ gap: 8 }}>
                <button type="button" className="btn btn-sm" disabled={trang <= 1} onClick={() => setTrang(trang - 1)}>Trước</button>
                <button type="button" className="btn btn-sm" disabled={trang >= tongTrang} onClick={() => setTrang(trang + 1)}>Sau</button>
              </div>
            </div>
          )}
        </div>
      )}
      <p className="goi-y">Để trống ngày = tính từ trước đến nay. Lọc theo ngày thanh toán.</p>
    </section>
  );
}
