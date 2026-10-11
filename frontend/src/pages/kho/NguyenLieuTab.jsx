// KHO-01: danh sách nguyên liệu + thêm/sửa/xóa. Số tồn không sửa tay: chỉ đổi qua nhập hàng và bán hàng.
import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { useToast } from '../../components/Toast.jsx';
import DataTable from '../../components/DataTable.jsx';
import Pagination from '../../components/Pagination.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Truong from '../../components/Truong.jsx';
import Icon from '../../components/Icon.jsx';
import { dsNguyenLieu, taoNguyenLieu, suaNguyenLieu, xoaNguyenLieu } from '../../api/kho.api.js';
import { soThuong } from '../../utils/format.js';
import { loiTheoTruong, thongBaoLoi } from '../../utils/loi.js';

const MOI_TRANG = 10;
const trong = nl => (nl ? { ten: nl.ten_nguyen_lieu, donVi: nl.don_vi_tinh, muc: String(Number(nl.muc_ton_toi_thieu)) } : { ten: '', donVi: '', muc: '' });

function Panel({ nl, onDaLuu, onDaXoa, onDong }) {
  const { thongBao } = useToast();
  const them = !nl;
  const [f, setF] = useState(() => trong(nl));
  const [loi, setLoi] = useState({});
  const [loiChung, setLoiChung] = useState('');
  const [ban, setBan] = useState(false);
  const [hoiXoa, setHoiXoa] = useState(false);
  useEffect(() => { setF(trong(nl)); setLoi({}); setLoiChung(''); }, [nl?.ma_nguyen_lieu, nl?.ten_nguyen_lieu, nl?.don_vi_tinh, nl?.muc_ton_toi_thieu]);
  const dat = k => e => setF(x => ({ ...x, [k]: e.target.value }));

  async function luu(e) {
    e.preventDefault();
    const l = {};
    if (!f.ten.trim()) l.ten_nguyen_lieu = 'Nhập tên nguyên liệu';
    if (!f.donVi.trim()) l.don_vi_tinh = 'Nhập đơn vị tính (g, ml, cái…)';
    if (f.muc !== '' && (Number.isNaN(Number(f.muc)) || Number(f.muc) < 0)) l.muc_ton_toi_thieu = 'Mức tối thiểu phải là số không âm';
    setLoi(l); setLoiChung('');
    if (Object.keys(l).length) return;
    setBan(true);
    const body = { ten_nguyen_lieu: f.ten.trim(), don_vi_tinh: f.donVi.trim(), ...(f.muc !== '' ? { muc_ton_toi_thieu: Number(f.muc) } : {}) };
    try {
      const kq = them ? await taoNguyenLieu(body) : await suaNguyenLieu(nl.ma_nguyen_lieu, body);
      thongBao(them ? 'Đã thêm nguyên liệu' : 'Đã lưu thay đổi');
      onDaLuu(kq);
    } catch (err) { setLoi(loiTheoTruong(err)); setLoiChung(thongBaoLoi(err)); } finally { setBan(false); }
  }

  async function xoa() {
    setBan(true);
    try { await xoaNguyenLieu(nl.ma_nguyen_lieu); thongBao('Đã xóa nguyên liệu'); setHoiXoa(false); onDaXoa(); }
    catch (err) { setHoiXoa(false); setLoiChung(thongBaoLoi(err)); } finally { setBan(false); }
  }

  return (
    <aside className="the panel" aria-label={them ? 'Thêm nguyên liệu' : 'Sửa nguyên liệu'}>
      <div className="hang-dau">
        <h2>{them ? 'Thêm nguyên liệu' : `Sửa ${nl.ten_nguyen_lieu}`}</h2>
        <button type="button" className="icon-btn" style={{ width: 36, height: 36 }} aria-label="Đóng panel" onClick={onDong}>×</button>
      </div>
      {loiChung && <div className="banner banner-loi" role="alert">{loiChung}</div>}
      <form onSubmit={luu} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Truong id="nl-ten" nhan="Tên nguyên liệu" loi={loi.ten_nguyen_lieu}>{p => <input {...p} className="o-nhap" value={f.ten} onChange={dat('ten')} autoFocus={them} />}</Truong>
        <Truong id="nl-dv" nhan="Đơn vị tính" loi={loi.don_vi_tinh} goiY={!them ? 'Không đổi được khi còn tồn kho hoặc đã dùng trong công thức, phiếu nhập' : undefined}>
          {p => <input {...p} className="o-nhap" value={f.donVi} onChange={dat('donVi')} placeholder="g, ml, cái…" />}
        </Truong>
        <Truong id="nl-muc" nhan="Mức tồn tối thiểu" loi={loi.muc_ton_toi_thieu} goiY="Tồn bằng hoặc dưới mức này thì báo sắp hết">
          {p => <input {...p} className="o-nhap" type="number" min="0" step="any" inputMode="decimal" value={f.muc} onChange={dat('muc')} />}
        </Truong>
        {!them && <p className="goi-y">Đang tồn: <strong>{soThuong(nl.so_luong_ton)} {nl.don_vi_tinh}</strong>. Số tồn chỉ đổi qua nhập hàng và bán hàng.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button type="submit" className="btn btn-primary btn-block" disabled={ban}>{ban ? 'Đang lưu…' : (them ? 'Thêm nguyên liệu' : 'Lưu thay đổi')}</button>
          {!them && <button type="button" className="btn btn-danger btn-block" disabled={ban} onClick={() => setHoiXoa(true)}>Xóa nguyên liệu</button>}
        </div>
      </form>
      {hoiXoa && <ConfirmDialog tieuDe="Xóa nguyên liệu?" nguyHiem nhanXacNhan="Xóa" dangXuLy={ban} noiDung={`Xóa “${nl.ten_nguyen_lieu}”. Nguyên liệu đã nằm trong công thức hoặc phiếu nhập thì không xóa được.`} onXacNhan={xoa} onHuy={() => setHoiXoa(false)} />}
    </aside>
  );
}

export default function NguyenLieuTab() {
  const [tim, setTim] = useState('');
  const [loc, setLoc] = useState({ tu_khoa: '', trang: 1 });
  const [chon, setChon] = useState(null); // null | 'them' | mã
  useEffect(() => { const t = setTimeout(() => setLoc(l => (l.tu_khoa === tim.trim() ? l : { tu_khoa: tim.trim(), trang: 1 })), 300); return () => clearTimeout(t); }, [tim]);

  const ds = useApi(() => dsNguyenLieu({ ...loc, moi_trang: MOI_TRANG }), [loc.tu_khoa, loc.trang]);
  const dong = ds.data?.data ?? [];
  const tong = ds.data?.tong_so_ban_ghi ?? 0;
  const dangChon = typeof chon === 'number' ? dong.find(d => d.ma_nguyen_lieu === chon) ?? null : null;

  const cot = [
    { khoa: 'ten_nguyen_lieu', tieuDe: 'Nguyên liệu', hienThi: d => <strong>{d.ten_nguyen_lieu}</strong> },
    { khoa: 'don_vi_tinh', tieuDe: 'Đơn vị' },
    { khoa: 'so_luong_ton', tieuDe: 'Tồn', canPhai: true, hienThi: d => soThuong(d.so_luong_ton) },
    { khoa: 'muc_ton_toi_thieu', tieuDe: 'Tối thiểu', canPhai: true, hienThi: d => soThuong(d.muc_ton_toi_thieu) },
  ];

  return (
    <>
      <div className="bo-loc" style={{ justifyContent: 'space-between' }}>
        <div className="o-tim">
          <label htmlFor="tk-nl" className="sr-only">Tìm nguyên liệu</label>
          <Icon ten="tim" size={18} mau="#5B6B69" />
          <input id="tk-nl" type="search" className="o-nhap" placeholder="Tìm theo tên nguyên liệu" value={tim} onChange={e => setTim(e.target.value)} />
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setChon('them')}>Thêm nguyên liệu</button>
      </div>
      {ds.error && <div className="banner banner-loi" role="alert"><span>{thongBaoLoi(ds.error)}</span><button type="button" className="link-nut" onClick={ds.reload}>Thử lại</button></div>}
      <div className="hai-cot">
        <div className="the chinh">
          <DataTable tenBang="Danh sách nguyên liệu" cot={cot} dong={dong} khoaDong="ma_nguyen_lieu" dangChon={chon} dangTai={ds.loading} onChonDong={d => setChon(d.ma_nguyen_lieu)} trong="Chưa có nguyên liệu nào" />
          <Pagination trang={loc.trang} moiTrang={MOI_TRANG} tong={tong} onDoi={t => setLoc(l => ({ ...l, trang: t }))} />
        </div>
        {chon === null ? <aside className="the panel panel-rong">Chọn một nguyên liệu để sửa, hoặc bấm “Thêm nguyên liệu”.</aside>
          : (chon === 'them' || dangChon) && (
            <Panel key={chon} nl={chon === 'them' ? null : dangChon} onDong={() => setChon(null)}
                   onDaLuu={async kq => { await ds.reload(); setChon(kq?.ma_nguyen_lieu ?? chon); }}
                   onDaXoa={async () => { setChon(null); await ds.reload(); }} />
          )}
      </div>
    </>
  );
}
