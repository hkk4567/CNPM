// KHO-02: nhà cung cấp. Nhà cung cấp đã có phiếu nhập thì không xóa được (backend trả 409).
import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../components/Toast.jsx';
import DataTable from '../../components/DataTable.jsx';
import Pagination from '../../components/Pagination.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Truong from '../../components/Truong.jsx';
import Icon from '../../components/Icon.jsx';
import { dsNcc, taoNcc, suaNcc, xoaNcc } from '../../api/kho.api.js';
import { loiTheoTruong, thongBaoLoi } from '../../utils/loi.js';

const MOI_TRANG = 10;
const trong = n => (n ? { ten: n.ten_ncc, sdt: n.so_dien_thoai ?? '', diaChi: n.dia_chi ?? '' } : { ten: '', sdt: '', diaChi: '' });

function Panel({ ncc, onDaLuu, onDaXoa, onDong }) {
  const { thongBao } = useToast();
  const them = !ncc;
  const [f, setF] = useState(() => trong(ncc));
  const [loi, setLoi] = useState({});
  const [loiChung, setLoiChung] = useState('');
  const [ban, setBan] = useState(false);
  const [hoiXoa, setHoiXoa] = useState(false);
  useEffect(() => { setF(trong(ncc)); setLoi({}); setLoiChung(''); }, [ncc?.ma_ncc, ncc?.ten_ncc, ncc?.so_dien_thoai, ncc?.dia_chi]);
  const dat = k => e => setF(x => ({ ...x, [k]: e.target.value }));

  async function luu(e) {
    e.preventDefault();
    const l = {};
    if (!f.ten.trim()) l.ten_ncc = 'Nhập tên nhà cung cấp';
    if (f.sdt.trim() && !/^0\d{9,10}$/.test(f.sdt.trim())) l.so_dien_thoai = 'Số điện thoại gồm 10–11 chữ số, bắt đầu bằng 0';
    setLoi(l); setLoiChung('');
    if (Object.keys(l).length) return;
    setBan(true);
    // Ô để trống: sửa thì gửi null (xóa giá trị), thêm thì bỏ qua
    const rong = v => (v.trim() ? v.trim() : (them ? undefined : null));
    const body = { ten_ncc: f.ten.trim(), so_dien_thoai: rong(f.sdt), dia_chi: rong(f.diaChi) };
    for (const k of Object.keys(body)) if (body[k] === undefined) delete body[k];
    try {
      const kq = them ? await taoNcc(body) : await suaNcc(ncc.ma_ncc, body);
      thongBao(them ? 'Đã thêm nhà cung cấp' : 'Đã lưu thay đổi');
      onDaLuu(kq);
    } catch (err) { setLoi(loiTheoTruong(err)); setLoiChung(thongBaoLoi(err)); } finally { setBan(false); }
  }

  async function xoa() {
    setBan(true);
    try { await xoaNcc(ncc.ma_ncc); thongBao('Đã xóa nhà cung cấp'); setHoiXoa(false); onDaXoa(); }
    catch (err) { setHoiXoa(false); setLoiChung(thongBaoLoi(err)); } finally { setBan(false); }
  }

  return (
    <aside className="the panel" aria-label={them ? 'Thêm nhà cung cấp' : 'Sửa nhà cung cấp'}>
      <div className="hang-dau">
        <h2>{them ? 'Thêm nhà cung cấp' : `Sửa ${ncc.ten_ncc}`}</h2>
        <button type="button" className="icon-btn" style={{ width: 36, height: 36 }} aria-label="Đóng panel" onClick={onDong}>×</button>
      </div>
      {loiChung && <div className="banner banner-loi" role="alert">{loiChung}</div>}
      <form onSubmit={luu} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Truong id="ncc-ten" nhan="Tên nhà cung cấp" loi={loi.ten_ncc}>{p => <input {...p} className="o-nhap" value={f.ten} onChange={dat('ten')} autoFocus={them} />}</Truong>
        <Truong id="ncc-sdt" nhan="Số điện thoại" loi={loi.so_dien_thoai}>{p => <input {...p} className="o-nhap" type="tel" inputMode="tel" value={f.sdt} onChange={dat('sdt')} />}</Truong>
        <Truong id="ncc-dc" nhan="Địa chỉ" loi={loi.dia_chi}>{p => <input {...p} className="o-nhap" value={f.diaChi} onChange={dat('diaChi')} />}</Truong>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button type="submit" className="btn btn-primary btn-block" disabled={ban}>{ban ? 'Đang lưu…' : (them ? 'Thêm nhà cung cấp' : 'Lưu thay đổi')}</button>
          {!them && <button type="button" className="btn btn-danger btn-block" disabled={ban} onClick={() => setHoiXoa(true)}>Xóa nhà cung cấp</button>}
        </div>
      </form>
      {hoiXoa && <ConfirmDialog tieuDe="Xóa nhà cung cấp?" nguyHiem nhanXacNhan="Xóa" dangXuLy={ban} noiDung={`Xóa “${ncc.ten_ncc}”. Nhà cung cấp đã có phiếu nhập thì không xóa được.`} onXacNhan={xoa} onHuy={() => setHoiXoa(false)} />}
    </aside>
  );
}

export default function NccTab() {
  const [tim, setTim] = useState('');
  const [loc, setLoc] = useState({ tu_khoa: '', trang: 1 });
  const [chon, setChon] = useState(null);
  useEffect(() => { const t = setTimeout(() => setLoc(l => (l.tu_khoa === tim.trim() ? l : { tu_khoa: tim.trim(), trang: 1 })), 300); return () => clearTimeout(t); }, [tim]);

  const ds = useApi(() => dsNcc({ ...loc, moi_trang: MOI_TRANG }), [loc.tu_khoa, loc.trang]);
  const dong = ds.data?.data ?? [];
  const tong = ds.data?.tong_so_ban_ghi ?? 0;
  const dangChon = typeof chon === 'number' ? dong.find(d => d.ma_ncc === chon) ?? null : null;

  const cot = [
    { khoa: 'ten_ncc', tieuDe: 'Nhà cung cấp', hienThi: d => <strong>{d.ten_ncc}</strong> },
    { khoa: 'so_dien_thoai', tieuDe: 'Số điện thoại', hienThi: d => d.so_dien_thoai || <span className="goi-y">—</span> },
    { khoa: 'dia_chi', tieuDe: 'Địa chỉ', hienThi: d => d.dia_chi || <span className="goi-y">—</span> },
  ];

  return (
    <>
      <div className="bo-loc" style={{ justifyContent: 'space-between' }}>
        <div className="o-tim">
          <label htmlFor="tk-ncc" className="sr-only">Tìm nhà cung cấp</label>
          <Icon ten="tim" size={18} mau="#5B6B69" />
          <input id="tk-ncc" type="search" className="o-nhap" placeholder="Tìm theo tên hoặc số điện thoại" value={tim} onChange={e => setTim(e.target.value)} />
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setChon('them')}>Thêm nhà cung cấp</button>
      </div>
      {ds.error && <div className="banner banner-loi" role="alert"><span>{thongBaoLoi(ds.error)}</span><button type="button" className="link-nut" onClick={ds.reload}>Thử lại</button></div>}
      <div className="hai-cot">
        <div className="the chinh">
          <DataTable tenBang="Danh sách nhà cung cấp" cot={cot} dong={dong} khoaDong="ma_ncc" dangChon={chon} dangTai={ds.loading} onChonDong={d => setChon(d.ma_ncc)} trong="Chưa có nhà cung cấp nào" />
          <Pagination trang={loc.trang} moiTrang={MOI_TRANG} tong={tong} onDoi={t => setLoc(l => ({ ...l, trang: t }))} />
        </div>
        {chon === null ? <aside className="the panel panel-rong">Chọn một nhà cung cấp để sửa, hoặc bấm “Thêm nhà cung cấp”.</aside>
          : (chon === 'them' || dangChon) && (
            <Panel key={chon} ncc={chon === 'them' ? null : dangChon} onDong={() => setChon(null)}
                   onDaLuu={async kq => { await ds.reload(); setChon(kq?.ma_ncc ?? chon); }}
                   onDaXoa={async () => { setChon(null); await ds.reload(); }} />
          )}
      </div>
    </>
  );
}
