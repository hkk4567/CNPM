// KHO-04: form lập phiếu nhập. Lưu thì tồn kho các nguyên liệu được cộng ngay (backend làm trong một transaction).
import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../components/Toast.jsx';
import Truong from '../../components/Truong.jsx';
import { dsNcc, dsNguyenLieu, taoPhieuNhap } from '../../api/kho.api.js';
import { soThuong, tien } from '../../utils/format.js';
import { loiTheoTruong, thongBaoLoi } from '../../utils/loi.js';

const toiDa = (n, k) => Math.abs(n * 10 ** k - Math.round(n * 10 ** k)) < 1e-6; // tối đa k chữ số thập phân (cùng quy tắc backend)
const thanhTien = d => Math.round((Number(d.sl) || 0) * (Number(d.gia) || 0));

export default function PhieuNhapForm({ goiYMa = [], onXong }) {
  const { thongBao } = useToast();
  const ncc = useApi(async () => (await dsNcc({ moi_trang: 100 })).data, []);
  const nl = useApi(async () => (await dsNguyenLieu({ moi_trang: 100 })).data, []);
  const [maNcc, setMaNcc] = useState('');
  const [ngay, setNgay] = useState('');
  const [dong, setDong] = useState(() => (goiYMa.length ? goiYMa.map(m => ({ ma: String(m), sl: '', gia: '' })) : [{ ma: '', sl: '', gia: '' }]));
  const [loi, setLoi] = useState({});
  const [loiChung, setLoiChung] = useState('');
  const [ban, setBan] = useState(false);

  const dsNl = nl.data ?? [];
  const donVi = ma => dsNl.find(n => String(n.ma_nguyen_lieu) === ma)?.don_vi_tinh ?? '';
  const sua = (i, k, v) => setDong(d => d.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const tong = dong.reduce((s, d) => s + thanhTien(d), 0);

  function kiemTra() {
    const l = {};
    if (!maNcc) l.ncc = 'Chọn nhà cung cấp';
    if (ngay && new Date(ngay).getTime() > Date.now() + 5 * 60 * 1000) l.ngay = 'Ngày nhập không được ở tương lai';
    const da = new Set();
    dong.forEach((d, i) => {
      if (!d.ma) l[`ma${i}`] = 'Chọn nguyên liệu';
      else if (da.has(d.ma)) l[`ma${i}`] = 'Nguyên liệu bị lặp, gộp thành một dòng';
      da.add(d.ma);
      const sl = Number(d.sl); const gia = Number(d.gia);
      if (!(sl > 0) || !toiDa(sl, 3)) l[`sl${i}`] = 'Số lượng > 0, tối đa 3 số lẻ';
      if (!(gia > 0) || !toiDa(gia, 2)) l[`gia${i}`] = 'Đơn giá > 0, tối đa 2 số lẻ';
    });
    return l;
  }

  async function luu(e) {
    e.preventDefault();
    const l = kiemTra();
    setLoi(l); setLoiChung('');
    if (Object.keys(l).length) return;
    setBan(true);
    try {
      const kq = await taoPhieuNhap({
        ma_ncc: Number(maNcc),
        ...(ngay ? { ngay_nhap: ngay } : {}),
        items: dong.map(d => ({ ma_nguyen_lieu: Number(d.ma), so_luong_nhap: Number(d.sl), don_gia_nhap: Number(d.gia) })),
      });
      thongBao(`Đã lưu phiếu nhập #${kq.ma_phieu_nhap}, tổng ${tien(kq.tong_tien_nhap)}`);
      setDong([{ ma: '', sl: '', gia: '' }]); setNgay(''); setLoi({});
      onXong?.(kq);
    } catch (err) {
      setLoiChung(thongBaoLoi(err));
      const t = loiTheoTruong(err);
      if (t.ma_ncc) setLoi(x => ({ ...x, ncc: t.ma_ncc }));
    } finally { setBan(false); }
  }

  return (
    <form onSubmit={luu} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {(ncc.error || nl.error) && <div className="banner banner-loi" role="alert">{thongBaoLoi(ncc.error || nl.error)}</div>}
      {loiChung && <div className="banner banner-loi" role="alert">{loiChung}</div>}
      <Truong id="pn-ncc" nhan="Nhà cung cấp" loi={loi.ncc}>
        {p => (
          <select {...p} className="o-nhap" value={maNcc} onChange={e => setMaNcc(e.target.value)}>
            <option value="">{ncc.loading ? 'Đang tải…' : (ncc.data?.length ? 'Chọn nhà cung cấp' : 'Chưa có nhà cung cấp')}</option>
            {(ncc.data ?? []).map(n => <option key={n.ma_ncc} value={n.ma_ncc}>{n.ten_ncc}</option>)}
          </select>
        )}
      </Truong>
      <Truong id="pn-ngay" nhan="Ngày giờ nhập" loi={loi.ngay} goiY="Để trống = lấy thời điểm hiện tại">
        {p => <input {...p} className="o-nhap" type="datetime-local" value={ngay} onChange={e => setNgay(e.target.value)} />}
      </Truong>

      <fieldset className="truong" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="nhan" style={{ padding: 0, marginBottom: 8 }}>Nguyên liệu nhập</legend>
        {dong.map((d, i) => (
          <div key={i} className="dong-nhap">
            <div className="cong-thuc-dong">
              <select className="o-nhap" aria-label={`Nguyên liệu dòng ${i + 1}`} aria-invalid={!!loi[`ma${i}`]} value={d.ma} onChange={e => sua(i, 'ma', e.target.value)}>
                <option value="">Chọn nguyên liệu</option>
                {dsNl.map(n => <option key={n.ma_nguyen_lieu} value={n.ma_nguyen_lieu}>{n.ten_nguyen_lieu}</option>)}
              </select>
              {dong.length > 1 && <button type="button" className="icon-btn" style={{ width: 36, height: 36, flex: '0 0 auto' }} aria-label={`Bỏ dòng ${i + 1}`} onClick={() => setDong(x => x.filter((_, j) => j !== i))}>×</button>}
            </div>
            <div className="cong-thuc-dong">
              <input className="o-nhap" style={{ width: '50%' }} type="number" min="0" step="any" inputMode="decimal" placeholder={`Số lượng${donVi(d.ma) ? ` (${donVi(d.ma)})` : ''}`}
                     aria-label={`Số lượng dòng ${i + 1}`} aria-invalid={!!loi[`sl${i}`]} value={d.sl} onChange={e => sua(i, 'sl', e.target.value)} />
              <input className="o-nhap" style={{ width: '50%' }} type="number" min="0" step="any" inputMode="decimal" placeholder={`Đơn giá (đ${donVi(d.ma) ? `/${donVi(d.ma)}` : ''})`}
                     aria-label={`Đơn giá dòng ${i + 1}`} aria-invalid={!!loi[`gia${i}`]} value={d.gia} onChange={e => sua(i, 'gia', e.target.value)} />
            </div>
            {(loi[`ma${i}`] || loi[`sl${i}`] || loi[`gia${i}`]) && <span className="loi-truong">{loi[`ma${i}`] || loi[`sl${i}`] || loi[`gia${i}`]}</span>}
            {thanhTien(d) > 0 && <span className="goi-y" style={{ fontVariantNumeric: 'tabular-nums' }}>{soThuong(d.sl)} {donVi(d.ma)} × {tien(d.gia)} = <strong>{tien(thanhTien(d))}</strong></span>}
          </div>
        ))}
        <button type="button" className="btn btn-net-dut" onClick={() => setDong(x => [...x, { ma: '', sl: '', gia: '' }])}>Thêm nguyên liệu</button>
      </fieldset>

      <div className="tong-tien"><span>Tổng tiền nhập</span><strong>{tien(tong)}</strong></div>
      <button type="submit" className="btn btn-primary btn-block" style={{ minHeight: 48, fontSize: 16 }} disabled={ban}>{ban ? 'Đang lưu…' : 'Lưu phiếu nhập'}</button>
      <p className="goi-y">Khi lưu, tồn kho của các nguyên liệu trên được cộng thêm ngay.</p>
    </form>
  );
}
