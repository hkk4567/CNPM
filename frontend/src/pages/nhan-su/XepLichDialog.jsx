// NS-05: xếp một nhân viên vào một ca cho nhiều ngày (chọn thứ trong tuần đang xem, lặp lại 1–8 tuần liên tiếp).
// Chỉ xếp từ hôm nay trở đi; tất cả hoặc không: nếu một ngày đã xếp rồi thì backend trả 409 và không tạo gì.
import { useState } from 'react';
import Dialog from '../../components/Dialog.jsx';
import { useToast } from '../../components/Toast.jsx';
import { xepLich } from '../../api/nhan-su.api.js';
import { THU_NGAN, congNgay, gioNgan, ngayNganGon } from '../../utils/format.js';
import { loiTheoTruong, thongBaoLoi } from '../../utils/loi.js';

export default function XepLichDialog({ nhanVien, ca, tuNgay, san, homNay, onDong, onXong }) {
  const { thongBao } = useToast();
  const ngayTuan = Array.from({ length: 7 }, (_, i) => congNgay(tuNgay, i));
  const [f, setF] = useState({ nv: '', ca: san.ma_ca ? String(san.ma_ca) : '', tuan: '1' });
  const [thu, setThu] = useState(() => new Set(san.ngay ? [ngayTuan.indexOf(san.ngay)].filter(i => i >= 0) : []));
  const [loi, setLoi] = useState({});
  const [loiChung, setLoiChung] = useState('');
  const [ban, setBan] = useState(false);
  const doiThu = i => { setLoi(l => ({ ...l, ngay_lam: undefined })); setThu(s => { const m = new Set(s); if (m.has(i)) m.delete(i); else m.add(i); return m; }); };

  // Các ngày sẽ xếp: mỗi thứ đã chọn x số tuần, bỏ ngày đã qua
  const dsNgay = [];
  for (let w = 0; w < Number(f.tuan); w++) for (const i of [...thu].sort()) { const n = congNgay(tuNgay, 7 * w + i); if (n >= homNay) dsNgay.push(n); }
  dsNgay.sort();

  async function gui(e) {
    e.preventDefault();
    const l = {};
    if (!f.nv) l.ma_nhan_vien = 'Chọn nhân viên';
    if (!f.ca) l.ma_ca = 'Chọn ca';
    if (!dsNgay.length) l.ngay_lam = 'Chọn ít nhất một ngày từ hôm nay trở đi';
    setLoi(l); setLoiChung('');
    if (Object.keys(l).length) return;
    setBan(true);
    try {
      await xepLich({ ma_nhan_vien: Number(f.nv), ma_ca: Number(f.ca), ngay_lam: dsNgay });
      thongBao(`Đã xếp ${dsNgay.length} ngày`);
      onXong();
    } catch (err) { setLoi(loiTheoTruong(err)); setLoiChung(thongBaoLoi(err)); } finally { setBan(false); }
  }

  return (
    <Dialog tieuDe="Xếp lịch làm việc" onDong={onDong} rong>
      {loiChung && <div className="banner banner-loi" role="alert">{loiChung}</div>}
      <form onSubmit={gui} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="truong">
          <label htmlFor="xl-nv">Nhân viên</label>
          <select id="xl-nv" className="o-nhap" aria-invalid={!!loi.ma_nhan_vien} value={f.nv} onChange={e => { setF(x => ({ ...x, nv: e.target.value })); setLoi(l => ({ ...l, ma_nhan_vien: undefined })); }} data-autofocus>
            <option value="">Chọn nhân viên</option>
            {nhanVien.map(n => <option key={n.ma_nhan_vien} value={n.ma_nhan_vien}>{n.ho_ten} – {n.chuc_vu}</option>)}
          </select>
          {loi.ma_nhan_vien && <span className="loi-truong">{loi.ma_nhan_vien}</span>}
        </div>
        <div className="truong">
          <label htmlFor="xl-ca">Ca</label>
          <select id="xl-ca" className="o-nhap" aria-invalid={!!loi.ma_ca} value={f.ca} onChange={e => { setF(x => ({ ...x, ca: e.target.value })); setLoi(l => ({ ...l, ma_ca: undefined })); }}>
            <option value="">Chọn ca</option>
            {ca.map(c => <option key={c.ma_ca} value={c.ma_ca}>{c.ten_ca} ({gioNgan(c.thoi_gian_bat_dau)}–{gioNgan(c.thoi_gian_ket_thuc)})</option>)}
          </select>
          {loi.ma_ca && <span className="loi-truong">{loi.ma_ca}</span>}
        </div>
        <fieldset className="truong" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="nhan" style={{ padding: 0, marginBottom: 8 }}>Các ngày trong tuần {ngayNganGon(ngayTuan[0])} – {ngayNganGon(ngayTuan[6])}</legend>
          <div className="nhom-radio">
            {ngayTuan.map((n, i) => (
              <label key={n} className="radio-the" style={n < homNay ? { opacity: .5 } : undefined}>
                <input type="checkbox" checked={thu.has(i)} disabled={n < homNay} onChange={() => doiThu(i)} />{THU_NGAN[i]} {ngayNganGon(n)}
              </label>
            ))}
          </div>
          {loi.ngay_lam && <span className="loi-truong">{loi.ngay_lam}</span>}
        </fieldset>
        <div className="truong">
          <label htmlFor="xl-tuan">Lặp lại</label>
          <select id="xl-tuan" className="o-nhap" value={f.tuan} onChange={e => setF(x => ({ ...x, tuan: e.target.value }))}>
            <option value="1">Chỉ tuần này</option>
            {[2, 3, 4, 6, 8].map(n => <option key={n} value={n}>{n} tuần liên tiếp</option>)}
          </select>
          <span className="goi-y">{dsNgay.length ? `Sẽ xếp ${dsNgay.length} ngày, từ ${ngayNganGon(dsNgay[0])} đến ${ngayNganGon(dsNgay[dsNgay.length - 1])}.` : 'Chưa chọn ngày nào.'}</span>
        </div>
        <div className="hop-nut">
          <button type="button" className="btn" onClick={onDong} disabled={ban}>Hủy</button>
          <button type="submit" className="btn btn-primary" disabled={ban}>{ban ? 'Đang xếp…' : 'Xếp lịch'}</button>
        </div>
      </form>
    </Dialog>
  );
}
