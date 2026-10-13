// NS-07 lịch tuần dạng lưới (hàng = ca, cột = 7 ngày), NS-05 xếp lịch (nút + trong ô hoặc nút "Xếp lịch"), NS-06 gỡ phân công (nút × trên tên).
import { useMemo, useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../components/Toast.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import XepLichDialog from './XepLichDialog.jsx';
import { dsCa, dsNhanVien, goPhanCong, lichTuan } from '../../api/nhan-su.api.js';
import { THU_NGAN, congNgay, gioNgan, homNay, ngayNganGon, thuHaiCua } from '../../utils/format.js';
import { thongBaoLoi } from '../../utils/loi.js';

export default function LichTuan() {
  const { thongBao } = useToast();
  const hom = homNay();
  const [tuNgay, setTuNgay] = useState(() => thuHaiCua(hom));
  const [maNv, setMaNv] = useState('');
  const [xep, setXep] = useState(null);   // null | { ma_ca?, ngay? }
  const [go, setGo] = useState(null);     // phân công đang hỏi gỡ
  const [ban, setBan] = useState(false);

  const tuan = useApi(() => lichTuan({ tu_ngay: tuNgay, ma_nhan_vien: maNv }), [tuNgay, maNv]);
  const ca = useApi(() => dsCa(), []);
  const nv = useApi(async () => (await dsNhanVien({ trang_thai: 'dang_lam', moi_trang: 100 })).data, []);

  const ngay = useMemo(() => Array.from({ length: 7 }, (_, i) => congNgay(tuNgay, i)), [tuNgay]);
  const o = useMemo(() => {
    const m = new Map();
    for (const p of tuan.data?.data ?? []) { const k = `${p.ngay_lam}|${p.ma_ca}`; m.set(k, [...(m.get(k) ?? []), p]); }
    return m;
  }, [tuan.data]);
  const dsCaHang = ca.data ?? [];
  const tuanNay = thuHaiCua(hom);
  const doiTuan = n => setTuNgay(t => congNgay(t, 7 * n));
  const lamMoi = () => Promise.all([tuan.reload(), ca.reload()]);

  async function goKhoiCa() {
    setBan(true);
    try { await goPhanCong(go); thongBao('Đã gỡ khỏi ca'); setGo(null); await lamMoi(); }
    catch (err) { setGo(null); thongBao(thongBaoLoi(err), 'loi'); } finally { setBan(false); }
  }

  return (
    <>
      <div className="bo-loc">
        <div className="hang-nut" style={{ gap: 8, alignItems: 'center' }}>
          <button type="button" className="btn" aria-label="Tuần trước" onClick={() => doiTuan(-1)}>‹</button>
          <strong style={{ minWidth: 150, textAlign: 'center' }} aria-live="polite">{ngayNganGon(ngay[0])} – {ngayNganGon(ngay[6])}/{ngay[6].slice(0, 4)}</strong>
          <button type="button" className="btn" aria-label="Tuần sau" onClick={() => doiTuan(1)}>›</button>
          <button type="button" className="btn" disabled={tuNgay === tuanNay} onClick={() => setTuNgay(tuanNay)}>Tuần này</button>
        </div>
        <div>
          <label htmlFor="lt-nv" className="sr-only">Lọc theo nhân viên</label>
          <select id="lt-nv" className="o-nhap" value={maNv} onChange={e => setMaNv(e.target.value)}>
            <option value="">Tất cả nhân viên</option>
            {(nv.data ?? []).map(n => <option key={n.ma_nhan_vien} value={n.ma_nhan_vien}>{n.ho_ten}</option>)}
          </select>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setXep({})}>Xếp lịch</button>
      </div>

      {(tuan.error || ca.error) && <div className="banner banner-loi" role="alert"><span>{thongBaoLoi(tuan.error || ca.error)}</span><button type="button" className="link-nut" onClick={lamMoi}>Thử lại</button></div>}

      <div className="the">
        <div className="bang-boc">
          <table className="bang lich" aria-label="Lịch làm việc theo tuần" aria-busy={tuan.loading}>
            <thead>
              <tr>
                <th scope="col">Ca</th>
                {ngay.map((n, i) => <th key={n} scope="col" className={n === hom ? 'hom-nay' : undefined}>{THU_NGAN[i]} <span className="goi-y">{ngayNganGon(n)}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {dsCaHang.map(c => (
                <tr key={c.ma_ca}>
                  <th scope="row"><strong>{c.ten_ca}</strong><br /><span className="goi-y">{gioNgan(c.thoi_gian_bat_dau)}–{gioNgan(c.thoi_gian_ket_thuc)}</span></th>
                  {ngay.map(n => (
                    <td key={n} className={n === hom ? 'hom-nay' : undefined}>
                      <div className="o-lich">
                        {(o.get(`${n}|${c.ma_ca}`) ?? []).map(p => (
                          <span key={p.ma_nhan_vien} className="the-nv">
                            {p.ho_ten}
                            <button type="button" aria-label={`Gỡ ${p.ho_ten} khỏi ${c.ten_ca} ngày ${ngayNganGon(n)}`} onClick={() => setGo({ ma_nhan_vien: p.ma_nhan_vien, ma_ca: c.ma_ca, ngay_lam: n, ho_ten: p.ho_ten, ten_ca: c.ten_ca })}>×</button>
                          </span>
                        ))}
                        {n >= hom && <button type="button" className="them-lich" aria-label={`Xếp người vào ${c.ten_ca} ngày ${ngayNganGon(n)}`} onClick={() => setXep({ ma_ca: c.ma_ca, ngay: n })}>+</button>}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!dsCaHang.length && <div className="bang-rong">{ca.loading ? 'Đang tải…' : 'Chưa có ca làm việc. Hãy tạo ca ở tab “Ca làm việc” trước khi xếp lịch.'}</div>}
        {!!dsCaHang.length && !tuan.loading && !(tuan.data?.data ?? []).length && <div className="chu-thich">Tuần này chưa có ai được xếp ca. Bấm dấu + trong ô hoặc “Xếp lịch”.</div>}
      </div>

      {xep && (
        <XepLichDialog nhanVien={nv.data ?? []} ca={dsCaHang} tuNgay={tuNgay} san={xep} homNay={hom}
                       onDong={() => setXep(null)} onXong={async () => { setXep(null); await lamMoi(); }} />
      )}
      {go && (
        <ConfirmDialog tieuDe="Gỡ khỏi ca?" nguyHiem nhanXacNhan="Gỡ" dangXuLy={ban} onXacNhan={goKhoiCa} onHuy={() => setGo(null)}
                       noiDung={`Gỡ ${go.ho_ten} khỏi ${go.ten_ca} ngày ${ngayNganGon(go.ngay_lam)}. Bạn có thể xếp lại sau.`} />
      )}
    </>
  );
}
