// KHO-06: tồn kho + cảnh báo sắp hết, kèm form Lập phiếu nhập bên phải (KHO-04).
import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import DataTable from '../../components/DataTable.jsx';
import Icon from '../../components/Icon.jsx';
import PhieuNhapForm from './PhieuNhapForm.jsx';
import { dsTonKho } from '../../api/kho.api.js';
import { soThuong } from '../../utils/format.js';
import { thongBaoLoi } from '../../utils/loi.js';

// Thanh mức tồn: vạch đen = mức tối thiểu; thang đo = max(6 x tối thiểu, tồn) để mọi dòng so sánh được
function ThanhTon({ ton, toiThieu, sapHet }) {
  const thang = Math.max(toiThieu * 6, ton) || 1;
  return (
    <div style={{ position: 'relative', height: 8, background: '#E4EAE8', borderRadius: 999, minWidth: 120 }} role="img"
         aria-label={`Tồn ${soThuong(ton)}, tối thiểu ${soThuong(toiThieu)}`}>
      <div style={{ width: `${Math.min(100, (ton / thang) * 100)}%`, height: 8, background: sapHet ? '#B7791F' : '#1B6B63', borderRadius: 999 }} />
      {toiThieu > 0 && <div style={{ position: 'absolute', left: `${(toiThieu / thang) * 100}%`, top: -4, width: 2, height: 16, background: '#1A2B2A' }} />}
    </div>
  );
}

export default function TonKhoTab() {
  const [tim, setTim] = useState('');
  const [tuKhoa, setTuKhoa] = useState('');
  const [chiSapHet, setChiSapHet] = useState(false);
  const [goiY, setGoiY] = useState({ lan: 0, ma: [] }); // bấm "Lập phiếu nhập" ở cảnh báo: điền sẵn các nguyên liệu sắp hết

  useEffect(() => { const t = setTimeout(() => setTuKhoa(tim.trim()), 300); return () => clearTimeout(t); }, [tim]);

  const tk = useApi(() => dsTonKho({ tu_khoa: tuKhoa, chi_sap_het: chiSapHet ? 'true' : undefined }), [tuKhoa, chiSapHet]);
  const canhBao = useApi(() => dsTonKho({ chi_sap_het: 'true' }), []); // cảnh báo luôn tính trên toàn kho, không phụ thuộc bộ lọc
  const dong = (tk.data ?? []).map(r => ({ ...r, ton: Number(r.so_luong_ton), toiThieu: Number(r.muc_ton_toi_thieu) }));
  const sapHet = canhBao.data ?? [];

  const cot = [
    { khoa: 'ten_nguyen_lieu', tieuDe: 'Nguyên liệu', hienThi: d => <strong>{d.ten_nguyen_lieu}</strong> },
    { khoa: 'ton', tieuDe: 'Tồn', canPhai: true, hienThi: d => <strong>{soThuong(d.ton)} {d.don_vi_tinh}</strong> },
    { khoa: 'toiThieu', tieuDe: 'Tối thiểu', canPhai: true, hienThi: d => <span className="goi-y">{soThuong(d.toiThieu)} {d.don_vi_tinh}</span> },
    { khoa: 'muc', tieuDe: 'Mức tồn', hienThi: d => <ThanhTon ton={d.ton} toiThieu={d.toiThieu} sapHet={d.sap_het} /> },
    { khoa: 'sap_het', tieuDe: 'Tình trạng', hienThi: d => <span className={`chip ${d.sap_het ? 'chip-warn' : 'chip-ok'}`}>{d.sap_het ? 'Sắp hết' : 'Đủ'}</span> },
  ];

  return (
    <>
      {sapHet.length > 0 && (
        <div className="canh-bao" role="status">
          <Icon ten="canhBao" size={24} mau="#8A5300" />
          <p>
            {sapHet.length === 1
              ? <><strong>{sapHet[0].ten_nguyen_lieu} còn {soThuong(sapHet[0].so_luong_ton)} {sapHet[0].don_vi_tinh}</strong>, đã chạm hoặc dưới mức tối thiểu {soThuong(sapHet[0].muc_ton_toi_thieu)} {sapHet[0].don_vi_tinh}.</>
              : <><strong>{sapHet.length} nguyên liệu sắp hết:</strong> {sapHet.map(s => s.ten_nguyen_lieu).join(', ')}.</>}
          </p>
          <button type="button" className="btn btn-canh-bao" onClick={() => setGoiY(g => ({ lan: g.lan + 1, ma: sapHet.map(s => s.ma_nguyen_lieu) }))}>Lập phiếu nhập</button>
        </div>
      )}
      {(tk.error || canhBao.error) && <div className="banner banner-loi" role="alert">{thongBaoLoi(tk.error || canhBao.error)}</div>}

      <div className="bo-loc">
        <div className="o-tim">
          <label htmlFor="tk-kho" className="sr-only">Tìm nguyên liệu</label>
          <Icon ten="tim" size={18} mau="#5B6B69" />
          <input id="tk-kho" type="search" className="o-nhap" placeholder="Tìm theo tên nguyên liệu" value={tim} onChange={e => setTim(e.target.value)} />
        </div>
        <label className="radio-the"><input type="checkbox" checked={chiSapHet} onChange={e => setChiSapHet(e.target.checked)} />Chỉ hiện sắp hết</label>
      </div>

      <div className="hai-cot">
        <div className="the chinh">
          <DataTable tenBang="Tồn kho" cot={cot} dong={dong.map(d => ({ ...d, __canhBao: d.sap_het }))} khoaDong="ma_nguyen_lieu" dangTai={tk.loading} trong="Không có nguyên liệu nào" />
          <p className="chu-thich">Vạch đen trên thanh là mức tối thiểu. Nguyên liệu sắp hết luôn xếp đầu bảng.</p>
        </div>
        <section className="the panel" aria-label="Lập phiếu nhập">
          <h2>Lập phiếu nhập</h2>
          <PhieuNhapForm key={goiY.lan} goiYMa={goiY.ma} onXong={() => { tk.reload(); canhBao.reload(); }} />
        </section>
      </div>
    </>
  );
}
