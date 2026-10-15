// Chi tiết một hóa đơn (POS-11), chỉ xem. Nút "In hóa đơn" in riêng khung này (xem @media print trong index.css).
import { useApi } from '../../hooks/useApi.js';
import { chiTietHoaDon } from '../../api/hoa-don.api.js';
import { CHIP_TRANG_THAI_HD, PHUONG_THUC, TEN_TRANG_THAI_HD, ngayGioNgan, tien } from '../../utils/format.js';
import { thongBaoLoi } from '../../utils/loi.js';

export default function HoaDonPanel({ ma, onDong }) {
  const r = useApi(() => chiTietHoaDon(ma), [ma]);
  const h = r.data;
  const daTT = h?.trang_thai === 'da_thanh_toan';

  return (
    <aside className="the panel panel-hoa-don" aria-label="Chi tiết hóa đơn">
      <div className="hang-dau">
        <h2>{h ? `Hóa đơn #${h.so_thu_tu}` : 'Hóa đơn'}</h2>
        <button type="button" className="icon-btn khong-in" style={{ width: 36, height: 36 }} aria-label="Đóng panel" onClick={onDong}>×</button>
      </div>
      {r.error && <div className="banner banner-loi" role="alert"><span>{thongBaoLoi(r.error)}</span><button type="button" className="link-nut" onClick={r.reload}>Thử lại</button></div>}
      {!h && !r.error && <p className="goi-y">Đang tải…</p>}
      {h && (
        <>
          <div><span className={`chip ${CHIP_TRANG_THAI_HD[h.trang_thai]}`}>{TEN_TRANG_THAI_HD[h.trang_thai]}</span></div>
          <dl className="thong-tin">
            <div><dt>Thời gian</dt><dd>{ngayGioNgan(h.thoi_gian_tao)}</dd></div>
            <div><dt>Nhân viên</dt><dd>{h.ten_nhan_vien}</dd></div>
            <div><dt>Khách</dt><dd>{h.ten_khach_hang ?? 'Khách lẻ'}</dd></div>
            <div><dt>Thanh toán</dt><dd>{h.phuong_thuc_thanh_toan ? PHUONG_THUC[h.phuong_thuc_thanh_toan] ?? h.phuong_thuc_thanh_toan : 'Chưa thanh toán'}</dd></div>
          </dl>
          <ul className="ds-doc" aria-label="Các món">
            {h.chi_tiet.map(c => (
              <li key={c.ma_chi_tiet}>
                <span>
                  <strong>{c.so_luong} × {c.ten_san_pham}</strong><br />
                  <span className="goi-y">{tien(c.don_gia)} / ly</span>
                  {c.ghi_chu && <><br /><span className="goi-y">Ghi chú: {c.ghi_chu}</span></>}
                  {c.giam_gia > 0 && <><br /><span className="goi-y" style={{ color: 'var(--ok-fg)' }}>{c.khuyen_mai?.map(k => k.ten_khuyen_mai).join(', ') || 'Khuyến mãi'} −{tien(c.giam_gia)}</span></>}
                </span>
                <strong style={{ textAlign: 'right' }}>{tien(c.thanh_tien)}</strong>
              </li>
            ))}
          </ul>
          <dl className="cong-hd">
            <div><dt>Tiền hàng</dt><dd>{tien(h.tong_tien_hang)}</dd></div>
            {h.tong_giam_gia > 0 && <div><dt>Giảm giá</dt><dd style={{ color: 'var(--ok-fg)' }}>−{tien(h.tong_giam_gia)}</dd></div>}
            <div className="tong"><dt>{daTT ? 'Tổng tiền' : 'Tạm tính'}</dt><dd>{tien(h.tong_tien ?? h.tong_tien_tam_tinh)}</dd></div>
          </dl>
          <button type="button" className="btn khong-in" onClick={() => window.print()}>In hóa đơn</button>
        </>
      )}
    </aside>
  );
}
