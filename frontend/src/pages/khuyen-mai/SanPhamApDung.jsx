// KM-04, KM-05: sản phẩm đang được hưởng khuyến mãi; thêm bằng ô chọn, gỡ bằng nút ×. Sản phẩm ngừng bán vẫn gán được.
import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../components/Toast.jsx';
import { chiTietKhuyenMai, themSanPhamKm, goSanPhamKm } from '../../api/khuyen-mai.api.js';
import { tien } from '../../utils/format.js';
import { thongBaoLoi } from '../../utils/loi.js';

export default function SanPhamApDung({ ma, tatCaSanPham, onDoi }) {
  const { thongBao } = useToast();
  const ct = useApi(() => chiTietKhuyenMai(ma), [ma]);
  const [them, setThem] = useState('');
  const [loi, setLoi] = useState('');
  const [ban, setBan] = useState(false);
  const ds = ct.data?.san_pham ?? [];
  const daCo = new Set(ds.map(s => s.ma_san_pham));
  const conLai = tatCaSanPham.filter(s => !daCo.has(s.ma_san_pham));

  async function chay(viec, tin) {
    setBan(true); setLoi('');
    try { await viec(); thongBao(tin); await ct.reload(); onDoi?.(); } catch (e) { setLoi(thongBaoLoi(e)); } finally { setBan(false); }
  }

  return (
    <section className="truong" aria-label="Sản phẩm áp dụng">
      <span className="nhan">Sản phẩm áp dụng</span>
      {loi && <div className="banner banner-loi" role="alert">{loi}</div>}
      {ct.loading ? <p className="goi-y">Đang tải…</p> : ds.length === 0 ? <p className="goi-y">Chưa có sản phẩm nào. Khuyến mãi chưa có sản phẩm thì chưa giảm giá cho ai.</p> : (
        <ul className="ds-doc">
          {ds.map(s => (
            <li key={s.ma_san_pham} style={{ alignItems: 'center' }}>
              <span>{s.ten_san_pham} <span className="goi-y">{tien(s.gia_ban)}{s.trang_thai === 'ngung_ban' ? ' · ngừng bán' : ''}</span></span>
              <button type="button" className="icon-btn" style={{ width: 36, height: 36 }} aria-label={`Gỡ ${s.ten_san_pham}`} disabled={ban}
                      onClick={() => chay(() => goSanPhamKm(ma, s.ma_san_pham), `Đã gỡ ${s.ten_san_pham}`)}>×</button>
            </li>
          ))}
        </ul>
      )}
      <div className="cong-thuc-dong">
        <label className="sr-only" htmlFor="km-them-sp">Thêm sản phẩm</label>
        <select id="km-them-sp" className="o-nhap" value={them} onChange={e => setThem(e.target.value)}>
          <option value="">{conLai.length ? 'Chọn sản phẩm để thêm' : 'Đã thêm hết sản phẩm'}</option>
          {conLai.map(s => <option key={s.ma_san_pham} value={s.ma_san_pham}>{s.ten_san_pham}</option>)}
        </select>
        <button type="button" className="btn btn-sm" disabled={!them || ban}
                onClick={() => chay(() => themSanPhamKm(ma, [Number(them)]).then(() => setThem('')), 'Đã thêm sản phẩm')}>Thêm</button>
      </div>
    </section>
  );
}
