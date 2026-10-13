// Màn Tài khoản và quyền (chỉ admin): đổi quyền truy cập và đặt lại mật khẩu (NS-02). Tạo tài khoản đi cùng "Thêm nhân viên" (NS-01).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../components/Toast.jsx';
import DataTable from '../../components/DataTable.jsx';
import Pagination from '../../components/Pagination.jsx';
import Icon from '../../components/Icon.jsx';
import Truong from '../../components/Truong.jsx';
import { kiemTraMatKhau } from './NhanVienPanel.jsx';
import { dsNhanVien, suaNhanVien } from '../../api/nhan-su.api.js';
import { TEN_QUYEN } from '../../utils/format.js';
import { thongBaoLoi } from '../../utils/loi.js';

const MOI_TRANG = 10;
const CHIP_QUYEN = { admin: 'chip-bad', quan_ly: 'chip-teal', nhan_vien: 'chip-off' };
const MO_TA = {
  admin: 'Toàn quyền: thêm, xóa nhân viên, đổi quyền, đặt lại mật khẩu, và mọi mục của quản lý.',
  quan_ly: 'Quản lý sản phẩm, khuyến mãi, kho, khách hàng, lịch làm việc, nhân viên (chỉ sửa thông tin) và báo cáo.',
  nhan_vien: 'Chỉ xem lịch làm việc của chính mình.',
};

function Panel({ tk, onDaLuu, onDong }) {
  const { nguoiDung } = useAuth();
  const { thongBao } = useToast();
  const [quyen, setQuyen] = useState(tk.quyen_truy_cap);
  const [mk, setMk] = useState('');
  const [loiMk, setLoiMk] = useState('');
  const [loiChung, setLoiChung] = useState('');
  const [ban, setBan] = useState(false);
  const laMinh = tk.ma_nhan_vien === nguoiDung.ma_nhan_vien;
  useEffect(() => { setQuyen(tk.quyen_truy_cap); setMk(''); setLoiMk(''); setLoiChung(''); }, [tk.ma_nhan_vien, tk.quyen_truy_cap]);

  async function gui(body, thanhCong) {
    setBan(true); setLoiChung('');
    try { const kq = await suaNhanVien(tk.ma_nhan_vien, body); thongBao(thanhCong); setMk(''); onDaLuu(kq); }
    catch (err) { setLoiChung(thongBaoLoi(err)); } finally { setBan(false); }
  }
  const luuQuyen = e => { e.preventDefault(); if (quyen !== tk.quyen_truy_cap) gui({ quyen_truy_cap: quyen }, 'Đã đổi quyền'); };
  const datMk = e => {
    e.preventDefault();
    const l = kiemTraMatKhau(mk); setLoiMk(l);
    if (!l) gui({ mat_khau: mk }, 'Đã đặt lại mật khẩu');
  };

  return (
    <aside className="the panel" aria-label="Sửa tài khoản">
      <div className="hang-dau">
        <h2>{tk.ten_dang_nhap}</h2>
        <button type="button" className="icon-btn" style={{ width: 36, height: 36 }} aria-label="Đóng panel" onClick={onDong}>×</button>
      </div>
      <p className="goi-y">{tk.ho_ten} · {tk.chuc_vu}</p>
      {loiChung && <div className="banner banner-loi" role="alert">{loiChung}</div>}
      <form onSubmit={luuQuyen} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <fieldset className="truong" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="nhan" style={{ padding: 0, marginBottom: 8 }}>Quyền truy cập</legend>
          <div className="nhom-radio">
            {Object.entries(TEN_QUYEN).map(([v, t]) => <label key={v} className="radio-the"><input type="radio" name="tk-quyen" value={v} checked={quyen === v} onChange={e => setQuyen(e.target.value)} />{t}</label>)}
          </div>
          <span className="goi-y">{MO_TA[quyen]}</span>
        </fieldset>
        {laMinh && quyen !== tk.quyen_truy_cap && <div className="banner banner-canh-bao">Bạn đang đổi quyền của chính mình. Hạ quyền xong bạn có thể mất quyền vào màn này.</div>}
        <button type="submit" className="btn btn-primary btn-block" disabled={ban || quyen === tk.quyen_truy_cap}>Lưu quyền</button>
      </form>
      <form onSubmit={datMk} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Truong id="tk-mk" nhan="Đặt lại mật khẩu" loi={loiMk} goiY="Nhập mật khẩu mới, 8–72 ký tự, có chữ cái và chữ số">
          {p => <input {...p} className="o-nhap" type="password" autoComplete="new-password" value={mk} onChange={e => setMk(e.target.value)} />}
        </Truong>
        <button type="submit" className="btn btn-block" disabled={ban || !mk}>Đặt lại mật khẩu</button>
      </form>
    </aside>
  );
}

export default function TaiKhoan() {
  const [o, setO] = useState('');
  const [loc, setLoc] = useState({ tu_khoa: '', quyen_truy_cap: '', trang: 1 });
  const [chon, setChon] = useState(null);
  useEffect(() => { const t = setTimeout(() => setLoc(l => (l.tu_khoa === o.trim() ? l : { ...l, tu_khoa: o.trim(), trang: 1 })), 300); return () => clearTimeout(t); }, [o]);
  const ds = useApi(() => dsNhanVien({ ...loc, moi_trang: MOI_TRANG }), [loc.tu_khoa, loc.quyen_truy_cap, loc.trang]);
  const dong = (ds.data?.data ?? []).map(d => ({ ...d, __mo: d.trang_thai === 'nghi_viec' }));
  const tong = ds.data?.tong_so_ban_ghi ?? 0;
  const maChon = chon?.ma_nhan_vien ?? null;
  const tkChon = maChon ? dong.find(d => d.ma_nhan_vien === maChon) ?? chon : null;

  const cot = [
    { khoa: 'ten_dang_nhap', tieuDe: 'Tên đăng nhập', hienThi: d => <strong>{d.ten_dang_nhap ?? '—'}</strong> },
    { khoa: 'ho_ten', tieuDe: 'Nhân viên' },
    { khoa: 'quyen_truy_cap', tieuDe: 'Quyền', hienThi: d => (d.quyen_truy_cap ? <span className={`chip ${CHIP_QUYEN[d.quyen_truy_cap]}`}>{TEN_QUYEN[d.quyen_truy_cap]}</span> : 'Chưa có tài khoản') },
    { khoa: 'trang_thai', tieuDe: 'Trạng thái', hienThi: d => (d.trang_thai === 'dang_lam' ? <span className="chip chip-ok">Đang làm</span> : <span className="chip chip-off">Nghỉ việc</span>) },
  ];

  return (
    <>
      <div className="dau-trang">
        <div><h1>Tài khoản và quyền</h1><p>Đổi quyền truy cập và đặt lại mật khẩu. Tài khoản mới được tạo cùng lúc với nhân viên ở mục <Link to="/nhan-vien">Nhân viên</Link>.</p></div>
      </div>

      <div className="the" style={{ padding: '4px 20px' }}>
        <ul className="ds-doc" aria-label="Các quyền">
          {Object.entries(TEN_QUYEN).map(([v, t]) => (
            <li key={v}><span><span className={`chip ${CHIP_QUYEN[v]}`}>{t}</span></span><span style={{ flex: 1, textAlign: 'left', maxWidth: 640 }}>{MO_TA[v]}</span></li>
          ))}
        </ul>
      </div>

      <div className="bo-loc">
        <div className="o-tim">
          <Icon ten="tim" size={18} />
          <label htmlFor="tk-tim" className="sr-only">Tìm tài khoản</label>
          <input id="tk-tim" className="o-nhap" type="search" placeholder="Tên đăng nhập hoặc họ tên" value={o} onChange={e => setO(e.target.value)} autoComplete="off" />
        </div>
        <div>
          <label htmlFor="tk-q" className="sr-only">Quyền</label>
          <select id="tk-q" className="o-nhap" value={loc.quyen_truy_cap} onChange={e => setLoc(l => ({ ...l, quyen_truy_cap: e.target.value, trang: 1 }))}>
            <option value="">Mọi quyền</option>
            {Object.entries(TEN_QUYEN).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </div>
      </div>

      {ds.error && <div className="banner banner-loi" role="alert"><span>{thongBaoLoi(ds.error)}</span><button type="button" className="link-nut" onClick={ds.reload}>Thử lại</button></div>}

      <div className="hai-cot">
        <div className="the chinh">
          <DataTable tenBang="Danh sách tài khoản" cot={cot} dong={dong} khoaDong="ma_nhan_vien" dangChon={maChon} dangTai={ds.loading}
                     onChonDong={d => (d.ma_tai_khoan ? setChon(d) : setChon(null))} trong="Không có tài khoản nào khớp bộ lọc" />
          <Pagination trang={loc.trang} moiTrang={MOI_TRANG} tong={tong} onDoi={t => setLoc(l => ({ ...l, trang: t }))} />
        </div>
        {tkChon
          ? <Panel key={maChon} tk={tkChon} onDong={() => setChon(null)} onDaLuu={async kq => { await ds.reload(); setChon(kq); }} />
          : <aside className="the panel panel-rong">Chọn một tài khoản trong bảng để đổi quyền hoặc đặt lại mật khẩu.</aside>}
      </div>
    </>
  );
}
