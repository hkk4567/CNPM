// NS-04: ca làm việc (thêm, sửa, xóa). Ca không qua nửa đêm: giờ bắt đầu phải sớm hơn giờ kết thúc. Ca đã có phân công thì không xóa được (409).
import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../components/Toast.jsx';
import DataTable from '../../components/DataTable.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Truong from '../../components/Truong.jsx';
import { dsCa, taoCa, suaCa, xoaCa } from '../../api/nhan-su.api.js';
import { gioNgan, soThuong } from '../../utils/format.js';
import { loiTheoTruong, thongBaoLoi } from '../../utils/loi.js';

const tuCa = c => (c ? { ten: c.ten_ca, bd: gioNgan(c.thoi_gian_bat_dau), kt: gioNgan(c.thoi_gian_ket_thuc) } : { ten: '', bd: '08:00', kt: '12:00' });

function Panel({ ca, onDaLuu, onDaXoa, onDong }) {
  const { thongBao } = useToast();
  const them = !ca;
  const [f, setF] = useState(() => tuCa(ca));
  const [loi, setLoi] = useState({});
  const [loiChung, setLoiChung] = useState('');
  const [ban, setBan] = useState(false);
  const [hoiXoa, setHoiXoa] = useState(false);
  useEffect(() => { setF(tuCa(ca)); setLoi({}); setLoiChung(''); }, [ca?.ma_ca, ca?.ten_ca, ca?.thoi_gian_bat_dau, ca?.thoi_gian_ket_thuc]);
  const dat = k => e => setF(x => ({ ...x, [k]: e.target.value }));

  async function luu(e) {
    e.preventDefault();
    const l = {};
    if (!f.ten.trim()) l.ten_ca = 'Nhập tên ca'; else if (f.ten.trim().length > 50) l.ten_ca = 'Tên ca tối đa 50 ký tự';
    if (!f.bd) l.thoi_gian_bat_dau = 'Chọn giờ bắt đầu';
    if (!f.kt) l.thoi_gian_ket_thuc = 'Chọn giờ kết thúc';
    if (f.bd && f.kt && f.bd >= f.kt) l.thoi_gian_ket_thuc = 'Giờ kết thúc phải sau giờ bắt đầu (ca qua đêm hãy tách thành hai ca)';
    setLoi(l); setLoiChung('');
    if (Object.keys(l).length) return;
    setBan(true);
    const body = { ten_ca: f.ten.trim(), thoi_gian_bat_dau: f.bd, thoi_gian_ket_thuc: f.kt };
    try {
      const kq = them ? await taoCa(body) : await suaCa(ca.ma_ca, body);
      thongBao(them ? 'Đã thêm ca' : 'Đã lưu thay đổi');
      onDaLuu(kq);
    } catch (err) { setLoi(loiTheoTruong(err)); setLoiChung(thongBaoLoi(err)); } finally { setBan(false); }
  }

  async function xoa() {
    setBan(true);
    try { await xoaCa(ca.ma_ca); thongBao('Đã xóa ca'); setHoiXoa(false); onDaXoa(); }
    catch (err) { setHoiXoa(false); setLoiChung(thongBaoLoi(err)); } finally { setBan(false); }
  }

  return (
    <aside className="the panel" aria-label={them ? 'Thêm ca' : 'Sửa ca'}>
      <div className="hang-dau">
        <h2>{them ? 'Thêm ca làm việc' : `Sửa ${ca.ten_ca}`}</h2>
        <button type="button" className="icon-btn" style={{ width: 36, height: 36 }} aria-label="Đóng panel" onClick={onDong}>×</button>
      </div>
      {loiChung && <div className="banner banner-loi" role="alert">{loiChung}</div>}
      <form onSubmit={luu} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Truong id="ca-ten" nhan="Tên ca" loi={loi.ten_ca}>{p => <input {...p} className="o-nhap" value={f.ten} onChange={dat('ten')} autoFocus={them} />}</Truong>
        <Truong id="ca-bd" nhan="Giờ bắt đầu" loi={loi.thoi_gian_bat_dau}>{p => <input {...p} className="o-nhap" type="time" value={f.bd} onChange={dat('bd')} />}</Truong>
        <Truong id="ca-kt" nhan="Giờ kết thúc" loi={loi.thoi_gian_ket_thuc}>{p => <input {...p} className="o-nhap" type="time" value={f.kt} onChange={dat('kt')} />}</Truong>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button type="submit" className="btn btn-primary btn-block" disabled={ban}>{ban ? 'Đang lưu…' : (them ? 'Thêm ca' : 'Lưu thay đổi')}</button>
          {!them && <button type="button" className="btn btn-danger btn-block" disabled={ban} onClick={() => setHoiXoa(true)}>Xóa ca</button>}
        </div>
      </form>
      {!them && <p className="goi-y">Ca đã có người được xếp thì không xóa được; hãy gỡ các phân công trước.</p>}
      {hoiXoa && <ConfirmDialog tieuDe="Xóa ca?" nguyHiem nhanXacNhan="Xóa" dangXuLy={ban} noiDung={`Xóa “${ca.ten_ca}”. Không hoàn tác được.`} onXacNhan={xoa} onHuy={() => setHoiXoa(false)} />}
    </aside>
  );
}

export default function CaLamViecTab() {
  const ds = useApi(() => dsCa(), []);
  const [chon, setChon] = useState(null); // null | 'them' | mã ca
  const dong = ds.data ?? [];
  const caChon = typeof chon === 'number' ? dong.find(c => c.ma_ca === chon) ?? null : null;

  const cot = [
    { khoa: 'ten_ca', tieuDe: 'Ca', hienThi: d => <strong>{d.ten_ca}</strong> },
    { khoa: 'gio', tieuDe: 'Giờ làm', hienThi: d => `${gioNgan(d.thoi_gian_bat_dau)} – ${gioNgan(d.thoi_gian_ket_thuc)}` },
    { khoa: 'so_phan_cong', tieuDe: 'Lượt phân công', canPhai: true, hienThi: d => soThuong(d.so_phan_cong) },
  ];

  return (
    <>
      <div className="bo-loc"><button type="button" className="btn btn-primary" onClick={() => setChon('them')}>Thêm ca</button></div>
      {ds.error && <div className="banner banner-loi" role="alert"><span>{thongBaoLoi(ds.error)}</span><button type="button" className="link-nut" onClick={ds.reload}>Thử lại</button></div>}
      <div className="hai-cot">
        <div className="the chinh">
          <DataTable tenBang="Danh sách ca làm việc" cot={cot} dong={dong} khoaDong="ma_ca" dangChon={chon} dangTai={ds.loading} onChonDong={d => setChon(d.ma_ca)} trong="Chưa có ca nào. Bấm “Thêm ca” để tạo ca đầu tiên." />
        </div>
        {chon === null ? <aside className="the panel panel-rong">Chọn một ca để sửa hoặc xóa, hoặc bấm “Thêm ca”.</aside>
          : (chon === 'them' || caChon) && <Panel key={chon} ca={chon === 'them' ? null : caChon} onDong={() => setChon(null)}
              onDaLuu={async kq => { await ds.reload(); setChon(kq?.ma_ca ?? chon); }} onDaXoa={async () => { setChon(null); await ds.reload(); }} />}
      </div>
    </>
  );
}
