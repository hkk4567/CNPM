// Màn Nhân viên (NS-01..NS-03): danh sách có tìm kiếm, lọc, phân trang + panel thêm/sửa/xóa.
import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import DataTable from '../../components/DataTable.jsx';
import Pagination from '../../components/Pagination.jsx';
import Icon from '../../components/Icon.jsx';
import NhanVienPanel from './NhanVienPanel.jsx';
import { dsNhanVien } from '../../api/nhan-su.api.js';
import { TEN_QUYEN } from '../../utils/format.js';
import { thongBaoLoi } from '../../utils/loi.js';

const MOI_TRANG = 10;
const CHIP_QUYEN = { admin: 'chip-bad', quan_ly: 'chip-teal', nhan_vien: 'chip-off' };

export default function NhanVien() {
  const { nguoiDung } = useAuth();
  const laAdmin = nguoiDung.quyen_truy_cap === 'admin';
  const [o, setO] = useState('');
  const [loc, setLoc] = useState({ tu_khoa: '', trang_thai: '', quyen_truy_cap: '', trang: 1 });
  const [chon, setChon] = useState(null); // null | 'them' | nhân viên
  useEffect(() => { const t = setTimeout(() => setLoc(l => (l.tu_khoa === o.trim() ? l : { ...l, tu_khoa: o.trim(), trang: 1 })), 300); return () => clearTimeout(t); }, [o]);

  const ds = useApi(() => dsNhanVien({ ...loc, moi_trang: MOI_TRANG }), [loc.tu_khoa, loc.trang_thai, loc.quyen_truy_cap, loc.trang]);
  const dong = (ds.data?.data ?? []).map(d => ({ ...d, __mo: d.trang_thai === 'nghi_viec' }));
  const tong = ds.data?.tong_so_ban_ghi ?? 0;
  const doiLoc = k => e => setLoc(l => ({ ...l, [k]: e.target.value, trang: 1 }));
  const maChon = chon && chon !== 'them' ? chon.ma_nhan_vien : null;
  const nvDangChon = maChon ? dong.find(d => d.ma_nhan_vien === maChon) ?? chon : null; // lấy bản mới nhất trong bảng nếu còn

  const cot = [
    { khoa: 'ho_ten', tieuDe: 'Nhân viên', hienThi: d => <><strong>{d.ho_ten}</strong><br /><span className="goi-y">{d.chuc_vu}</span></> },
    { khoa: 'so_dien_thoai', tieuDe: 'Số điện thoại', hienThi: d => d.so_dien_thoai ?? '—' },
    { khoa: 'ten_dang_nhap', tieuDe: 'Tài khoản', hienThi: d => (d.ten_dang_nhap ? <>{d.ten_dang_nhap} <span className={`chip ${CHIP_QUYEN[d.quyen_truy_cap]}`}>{TEN_QUYEN[d.quyen_truy_cap]}</span></> : '—') },
    { khoa: 'trang_thai', tieuDe: 'Trạng thái', hienThi: d => (d.trang_thai === 'dang_lam' ? <span className="chip chip-ok">Đang làm</span> : <span className="chip chip-off">Nghỉ việc</span>) },
  ];

  return (
    <>
      <div className="dau-trang">
        <div>
          <h1>Nhân viên</h1>
          <p>{ds.loading && !ds.data ? 'Đang tải…' : `${tong} nhân viên${loc.tu_khoa || loc.trang_thai || loc.quyen_truy_cap ? ' khớp bộ lọc' : ''}`}</p>
        </div>
        {laAdmin && <div className="hang-nut"><button type="button" className="btn btn-primary" onClick={() => setChon('them')}>Thêm nhân viên</button></div>}
      </div>

      <div className="bo-loc">
        <div className="o-tim">
          <Icon ten="tim" size={18} />
          <label htmlFor="nv-tim" className="sr-only">Tìm theo tên, số điện thoại hoặc tên đăng nhập</label>
          <input id="nv-tim" className="o-nhap" type="search" placeholder="Tên, SĐT hoặc tên đăng nhập" value={o} onChange={e => setO(e.target.value)} autoComplete="off" />
        </div>
        <div>
          <label htmlFor="nv-tt" className="sr-only">Trạng thái</label>
          <select id="nv-tt" className="o-nhap" value={loc.trang_thai} onChange={doiLoc('trang_thai')}>
            <option value="">Mọi trạng thái</option><option value="dang_lam">Đang làm</option><option value="nghi_viec">Nghỉ việc</option>
          </select>
        </div>
        <div>
          <label htmlFor="nv-q" className="sr-only">Quyền</label>
          <select id="nv-q" className="o-nhap" value={loc.quyen_truy_cap} onChange={doiLoc('quyen_truy_cap')}>
            <option value="">Mọi quyền</option>
            {Object.entries(TEN_QUYEN).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </div>
      </div>

      {ds.error && <div className="banner banner-loi" role="alert"><span>{thongBaoLoi(ds.error)}</span><button type="button" className="link-nut" onClick={ds.reload}>Thử lại</button></div>}

      <div className="hai-cot">
        <div className="the chinh">
          <DataTable tenBang="Danh sách nhân viên" cot={cot} dong={dong} khoaDong="ma_nhan_vien" dangChon={maChon} dangTai={ds.loading}
                     onChonDong={d => setChon(d)} trong="Không có nhân viên nào khớp bộ lọc" />
          <Pagination trang={loc.trang} moiTrang={MOI_TRANG} tong={tong} onDoi={t => setLoc(l => ({ ...l, trang: t }))} />
        </div>
        {chon === null
          ? <aside className="the panel panel-rong">Chọn một nhân viên trong bảng để xem hoặc sửa{laAdmin ? ', hoặc bấm “Thêm nhân viên”' : ''}.</aside>
          : <NhanVienPanel key={chon === 'them' ? 'them' : maChon} nv={chon === 'them' ? null : nvDangChon}
                           onDong={() => setChon(null)}
                           onDaLuu={async kq => { await ds.reload(); setChon(kq); }}
                           onDaXoa={async kq => { await ds.reload(); setChon(null); return kq; }} />}
      </div>
    </>
  );
}
