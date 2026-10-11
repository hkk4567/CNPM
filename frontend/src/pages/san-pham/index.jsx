// Màn Sản phẩm (SP-01..SP-05): bảng + bộ lọc + panel thêm/sửa. Danh sách lấy từ GET /san-pham (phân trang),
// cột Khuyến mãi và Công thức ghép từ GET /san-pham/menu (chỉ có sản phẩm đang bán).
import { useEffect, useMemo, useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import DataTable from '../../components/DataTable.jsx';
import Pagination from '../../components/Pagination.jsx';
import Icon from '../../components/Icon.jsx';
import SanPhamPanel from './SanPhamPanel.jsx';
import DanhMucDialog from './DanhMucDialog.jsx';
import { dsSanPham, dsDanhMuc, menu, dsNguyenLieu } from '../../api/san-pham.api.js';
import { tien } from '../../utils/format.js';
import { thongBaoLoi } from '../../utils/loi.js';

const MOI_TRANG = 10;

export default function SanPham() {
  const [tim, setTim] = useState('');
  const [loc, setLoc] = useState({ tu_khoa: '', ma_danh_muc: '', trang_thai: '', trang: 1 });
  const [chon, setChon] = useState(null);          // null | 'them' | mã sản phẩm
  const [moDanhMuc, setMoDanhMuc] = useState(false);

  // Gõ tìm kiếm: chờ 300ms mới gọi API
  useEffect(() => {
    const t = setTimeout(() => setLoc(l => (l.tu_khoa === tim.trim() ? l : { ...l, tu_khoa: tim.trim(), trang: 1 })), 300);
    return () => clearTimeout(t);
  }, [tim]);

  const ds = useApi(() => dsSanPham({ ...loc, moi_trang: MOI_TRANG }), [loc.tu_khoa, loc.ma_danh_muc, loc.trang_thai, loc.trang]);
  const dm = useApi(dsDanhMuc, []);
  const mn = useApi(menu, []);
  const nl = useApi(async () => (await dsNguyenLieu()).data, []);

  const thongTinMenu = useMemo(() => new Map((mn.data ?? []).map(m => [m.ma_san_pham, m])), [mn.data]);
  const dong = (ds.data?.data ?? []).map(d => ({ ...d, __mo: d.trang_thai === 'ngung_ban' }));
  const tong = ds.data?.tong_so_ban_ghi ?? 0;
  const spDangChon = typeof chon === 'number' ? dong.find(d => d.ma_san_pham === chon) ?? null : null;
  const doiLoc = k => e => setLoc(l => ({ ...l, [k]: e.target.value, trang: 1 }));

  const cot = [
    { khoa: 'ten_san_pham', tieuDe: 'Sản phẩm', hienThi: d => (
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.35 }}>
        <strong>{d.ten_san_pham}</strong><span className="goi-y">{d.ten_danh_muc}</span>
      </span>
    ) },
    { khoa: 'gia_ban', tieuDe: 'Giá bán', canPhai: true, hienThi: d => tien(d.gia_ban) },
    { khoa: 'km', tieuDe: 'Khuyến mãi', hienThi: d => {
      const m = thongTinMenu.get(d.ma_san_pham);
      if (!m) return <span className="goi-y">{d.trang_thai === 'con_ban' && mn.loading ? '…' : 'Không có'}</span>;
      if (!m.khuyen_mai.length) return <span className="goi-y">Không có</span>;
      return (
        <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
          {m.khuyen_mai.map(k => <span key={k.ma_khuyen_mai} className="chip chip-teal" title={`Giảm ${tien(k.muc_giam_moi_ly)} mỗi ly`}>{k.ten_khuyen_mai}</span>)}
        </span>
      );
    } },
    { khoa: 'ct', tieuDe: 'Công thức', hienThi: d => {
      const m = thongTinMenu.get(d.ma_san_pham);
      if (!m) return <span className="goi-y">—</span>;
      return m.so_ly_toi_da === null ? <span className="chip chip-warn">Chưa có</span> : `Đủ ${m.so_ly_toi_da} ly`;
    } },
    { khoa: 'trang_thai', tieuDe: 'Trạng thái', hienThi: d => (
      <span className={`chip ${d.trang_thai === 'con_ban' ? 'chip-ok' : 'chip-off'}`}>{d.trang_thai === 'con_ban' ? 'Đang bán' : 'Ngừng bán'}</span>
    ) },
  ];

  async function lamMoiSanPham() { await Promise.all([ds.reload(), mn.reload(), dm.reload()]); }

  return (
    <>
      <div className="dau-trang">
        <div>
          <h1>Sản phẩm</h1>
          <p>{ds.loading && !ds.data ? 'Đang tải…' : `${tong} sản phẩm${loc.tu_khoa || loc.ma_danh_muc || loc.trang_thai ? ' khớp bộ lọc' : ''}`}</p>
        </div>
        <div className="hang-nut">
          <button type="button" className="btn" onClick={() => setMoDanhMuc(true)}>Quản lý danh mục</button>
          <button type="button" className="btn btn-primary" onClick={() => setChon('them')}>Thêm sản phẩm</button>
        </div>
      </div>

      <div className="bo-loc">
        <div className="o-tim">
          <label htmlFor="tk" className="sr-only">Tìm sản phẩm</label>
          <Icon ten="tim" size={18} mau="#5B6B69" />
          <input id="tk" type="search" className="o-nhap" placeholder="Tìm theo tên sản phẩm" value={tim} onChange={e => setTim(e.target.value)} />
        </div>
        <div>
          <label htmlFor="dm" className="sr-only">Danh mục</label>
          <select id="dm" className="o-nhap" value={loc.ma_danh_muc} onChange={doiLoc('ma_danh_muc')}>
            <option value="">Tất cả danh mục</option>
            {(dm.data ?? []).map(d => <option key={d.ma_danh_muc} value={d.ma_danh_muc}>{d.ten_danh_muc}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="tt" className="sr-only">Trạng thái</label>
          <select id="tt" className="o-nhap" value={loc.trang_thai} onChange={doiLoc('trang_thai')}>
            <option value="">Mọi trạng thái</option>
            <option value="con_ban">Đang bán</option>
            <option value="ngung_ban">Ngừng bán</option>
          </select>
        </div>
      </div>

      {ds.error && (
        <div className="banner banner-loi" role="alert">
          <span>{thongBaoLoi(ds.error)}</span>
          <button type="button" className="link-nut" onClick={ds.reload}>Thử lại</button>
        </div>
      )}

      <div className="hai-cot">
        <div className="the chinh">
          <DataTable tenBang="Danh sách sản phẩm" cot={cot} dong={dong} khoaDong="ma_san_pham" dangChon={chon} dangTai={ds.loading}
                     onChonDong={d => setChon(d.ma_san_pham)} trong="Không có sản phẩm nào khớp bộ lọc" />
          <Pagination trang={loc.trang} moiTrang={MOI_TRANG} tong={tong} onDoi={t => setLoc(l => ({ ...l, trang: t }))} />
        </div>

        {chon === null ? (
          <aside className="the panel panel-rong">Chọn một sản phẩm trong bảng để sửa, hoặc bấm “Thêm sản phẩm”.</aside>
        ) : (chon === 'them' || spDangChon) && (
          <SanPhamPanel key={chon} sanPham={chon === 'them' ? null : spDangChon} danhMuc={dm.data ?? []} nguyenLieu={nl.data ?? []}
                        onDong={() => setChon(null)}
                        onDaLuu={async kq => { await lamMoiSanPham(); setChon(kq?.ma_san_pham ?? chon); }}
                        onDaXoa={async () => { setChon(null); await lamMoiSanPham(); }}
                        onDaDoiCongThuc={mn.reload} />
        )}
      </div>

      {moDanhMuc && <DanhMucDialog danhMuc={dm.data ?? []} onDoi={() => Promise.all([dm.reload(), ds.reload()])} onDong={() => setMoDanhMuc(false)} />}
    </>
  );
}
