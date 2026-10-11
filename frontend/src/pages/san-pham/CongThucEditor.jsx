// Công thức của một sản phẩm: xem và sửa (đặt lại toàn bộ danh sách nguyên liệu). Mảng rỗng = xóa công thức.
import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../components/Toast.jsx';
import { xemCongThuc, datCongThuc } from '../../api/san-pham.api.js';
import { soThuong } from '../../utils/format.js';
import { thongBaoLoi } from '../../utils/loi.js';

export default function CongThucEditor({ maSanPham, nguyenLieu, onDaDoi }) {
  const { thongBao } = useToast();
  const ct = useApi(() => xemCongThuc(maSanPham), [maSanPham]);
  const [dong, setDong] = useState(null); // null = đang xem; mảng = đang sửa
  const [loi, setLoi] = useState('');
  const [ban, setBan] = useState(false);

  const dsCu = ct.data?.nguyen_lieu ?? [];
  const batDauSua = () => {
    setLoi('');
    setDong(dsCu.map(c => ({ ma: String(c.ma_nguyen_lieu), dl: String(Number(c.dinh_luong)) })));
  };
  const donVi = ma => nguyenLieu.find(n => String(n.ma_nguyen_lieu) === ma)?.don_vi_tinh ?? '';
  const sua = (i, k, v) => setDong(d => d.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  async function luu() {
    const maDaDung = new Set();
    for (const [i, d] of dong.entries()) {
      if (!d.ma) { setLoi(`Dòng ${i + 1}: chọn nguyên liệu`); return; }
      if (maDaDung.has(d.ma)) { setLoi('Mỗi nguyên liệu chỉ xuất hiện một lần trong công thức'); return; }
      maDaDung.add(d.ma);
      if (!(Number(d.dl) > 0)) { setLoi(`Dòng ${i + 1}: định lượng phải lớn hơn 0`); return; }
    }
    setBan(true); setLoi('');
    try {
      await datCongThuc(maSanPham, dong.map(d => ({ ma_nguyen_lieu: Number(d.ma), dinh_luong: Number(d.dl) })));
      thongBao('Đã lưu công thức');
      setDong(null);
      await ct.reload();
      onDaDoi?.();
    } catch (e) { setLoi(thongBaoLoi(e)); } finally { setBan(false); }
  }

  return (
    <section className="truong" aria-label="Công thức">
      <div className="hang-dau">
        <span className="nhan">Công thức (cho 1 ly)</span>
        {dong === null && !ct.loading && <button type="button" className="link-nut" onClick={batDauSua}>{dsCu.length ? 'Sửa công thức' : 'Thêm công thức'}</button>}
      </div>
      {ct.error && <div className="banner banner-loi" role="alert">{thongBaoLoi(ct.error)}</div>}
      {loi && <div className="banner banner-loi" role="alert">{loi}</div>}

      {dong === null ? (
        ct.loading ? <p className="goi-y">Đang tải…</p>
          : dsCu.length ? (
            <ul className="ds-doc">
              {dsCu.map(c => (
                <li key={c.ma_nguyen_lieu}><span>{c.ten_nguyen_lieu}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{soThuong(c.dinh_luong)} {c.don_vi_tinh}</span></li>
              ))}
            </ul>
          ) : <p className="goi-y">Chưa có công thức. Sản phẩm không có công thức thì không bị giới hạn theo tồn kho.</p>
      ) : (
        <div className="cong-thuc">
          {dong.map((d, i) => (
            <div className="cong-thuc-dong" key={i}>
              <select className="o-nhap" aria-label={`Nguyên liệu dòng ${i + 1}`} value={d.ma} onChange={e => sua(i, 'ma', e.target.value)}>
                <option value="">Chọn nguyên liệu</option>
                {nguyenLieu.map(n => <option key={n.ma_nguyen_lieu} value={n.ma_nguyen_lieu}>{n.ten_nguyen_lieu}</option>)}
              </select>
              <input className="o-nhap" type="number" min="0" step="any" inputMode="decimal" aria-label={`Định lượng dòng ${i + 1}`} value={d.dl} onChange={e => sua(i, 'dl', e.target.value)} />
              <span className="cong-thuc-dv">{donVi(d.ma)}</span>
              <button type="button" className="icon-btn" style={{ width: 36, height: 36, flex: '0 0 auto' }} aria-label={`Bỏ dòng ${i + 1}`} onClick={() => setDong(x => x.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
          <div className="hang-nut">
            <button type="button" className="btn btn-sm" onClick={() => setDong(x => [...x, { ma: '', dl: '' }])}>Thêm nguyên liệu</button>
          </div>
          {dong.length === 0 && <p className="goi-y">Danh sách trống: lưu sẽ xóa công thức.</p>}
          <div className="hang-nut">
            <button type="button" className="btn btn-primary btn-sm" disabled={ban} onClick={luu}>{ban ? 'Đang lưu…' : 'Lưu công thức'}</button>
            <button type="button" className="btn btn-sm" disabled={ban} onClick={() => { setDong(null); setLoi(''); }}>Hủy</button>
          </div>
        </div>
      )}
    </section>
  );
}
