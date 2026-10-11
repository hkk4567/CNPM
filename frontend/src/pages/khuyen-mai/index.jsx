// Màn Khuyến mãi (KM-01..KM-07): bảng + bộ lọc + panel thêm/sửa/sản phẩm/hiệu quả.
import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import DataTable from '../../components/DataTable.jsx';
import Pagination from '../../components/Pagination.jsx';
import KhuyenMaiPanel from './KhuyenMaiPanel.jsx';
import { dsKhuyenMai } from '../../api/khuyen-mai.api.js';
import { dsSanPham } from '../../api/san-pham.api.js';
import { ngayGioNgan, soThuong, tien } from '../../utils/format.js';
import { thongBaoLoi } from '../../utils/loi.js';

const MOI_TRANG = 10;
const TRANG_THAI = {
  dang_chay: ['chip-ok', 'Đang chạy'],
  sap_dien_ra: ['chip-teal', 'Sắp diễn ra'],
  het_han: ['chip-off', 'Hết hạn'],
};

export default function KhuyenMai() {
  const [loc, setLoc] = useState({ trang_thai: '', ma_san_pham: '', trang: 1 });
  const [chon, setChon] = useState(null); // null | 'them' | mã khuyến mãi
  const ds = useApi(() => dsKhuyenMai({ ...loc, moi_trang: MOI_TRANG }), [loc.trang_thai, loc.ma_san_pham, loc.trang]);
  const sp = useApi(async () => (await dsSanPham({ moi_trang: 100 })).data, []);
  const tatCaSp = sp.data ?? [];

  const dong = (ds.data?.data ?? []).map(d => ({ ...d, __mo: d.trang_thai === 'het_han' }));
  const tong = ds.data?.tong_so_ban_ghi ?? 0;
  const kmDangChon = typeof chon === 'number' ? dong.find(d => d.ma_khuyen_mai === chon) ?? null : null;
  const doiLoc = k => e => setLoc(l => ({ ...l, [k]: e.target.value, trang: 1 }));

  const cot = [
    { khoa: 'ten_khuyen_mai', tieuDe: 'Khuyến mãi', hienThi: d => <strong>{d.ten_khuyen_mai}</strong> },
    { khoa: 'gia_tri_giam', tieuDe: 'Mức giảm', hienThi: d => (d.loai_giam === 'phan_tram' ? `${soThuong(d.gia_tri_giam)}%` : tien(d.gia_tri_giam)) },
    { khoa: 'thoi_gian', tieuDe: 'Thời gian', hienThi: d => <span style={{ fontSize: 14 }}>{ngayGioNgan(d.ngay_bat_dau)}<br />{ngayGioNgan(d.ngay_ket_thuc)}</span> },
    { khoa: 'so_san_pham', tieuDe: 'Sản phẩm', canPhai: true },
    { khoa: 'so_luot_dung', tieuDe: 'Ly đã giảm', canPhai: true, hienThi: d => soThuong(d.so_luot_dung) },
    { khoa: 'trang_thai', tieuDe: 'Trạng thái', hienThi: d => { const [c, t] = TRANG_THAI[d.trang_thai]; return <span className={`chip ${c}`}>{t}</span>; } },
  ];

  const lamMoi = () => Promise.all([ds.reload()]);

  return (
    <>
      <div className="dau-trang">
        <div>
          <h1>Khuyến mãi</h1>
          <p>{ds.loading && !ds.data ? 'Đang tải…' : `${tong} khuyến mãi${loc.trang_thai || loc.ma_san_pham ? ' khớp bộ lọc' : ''}`}</p>
        </div>
        <div className="hang-nut"><button type="button" className="btn btn-primary" onClick={() => setChon('them')}>Thêm khuyến mãi</button></div>
      </div>

      <div className="bo-loc">
        <div>
          <label htmlFor="km-tt" className="sr-only">Trạng thái</label>
          <select id="km-tt" className="o-nhap" value={loc.trang_thai} onChange={doiLoc('trang_thai')}>
            <option value="">Mọi trạng thái</option>
            <option value="dang_chay">Đang chạy</option>
            <option value="sap_dien_ra">Sắp diễn ra</option>
            <option value="het_han">Hết hạn</option>
          </select>
        </div>
        <div>
          <label htmlFor="km-sp" className="sr-only">Sản phẩm</label>
          <select id="km-sp" className="o-nhap" value={loc.ma_san_pham} onChange={doiLoc('ma_san_pham')}>
            <option value="">Mọi sản phẩm</option>
            {tatCaSp.map(s => <option key={s.ma_san_pham} value={s.ma_san_pham}>{s.ten_san_pham}</option>)}
          </select>
        </div>
      </div>

      {ds.error && <div className="banner banner-loi" role="alert"><span>{thongBaoLoi(ds.error)}</span><button type="button" className="link-nut" onClick={ds.reload}>Thử lại</button></div>}

      <div className="hai-cot">
        <div className="the chinh">
          <DataTable tenBang="Danh sách khuyến mãi" cot={cot} dong={dong} khoaDong="ma_khuyen_mai" dangChon={chon} dangTai={ds.loading}
                     onChonDong={d => setChon(d.ma_khuyen_mai)} trong="Chưa có khuyến mãi nào khớp bộ lọc" />
          <Pagination trang={loc.trang} moiTrang={MOI_TRANG} tong={tong} onDoi={t => setLoc(l => ({ ...l, trang: t }))} />
        </div>

        {chon === null ? (
          <aside className="the panel panel-rong">Chọn một khuyến mãi trong bảng để sửa, gán sản phẩm hoặc xem hiệu quả, hoặc bấm “Thêm khuyến mãi”.</aside>
        ) : (chon === 'them' || kmDangChon) && (
          <KhuyenMaiPanel key={chon} km={chon === 'them' ? null : kmDangChon} tatCaSanPham={tatCaSp}
                          onDong={() => setChon(null)} onDoi={lamMoi}
                          onDaLuu={async kq => { await lamMoi(); setChon(kq?.ma_khuyen_mai ?? chon); }}
                          onDaXoa={async () => { setChon(null); await lamMoi(); }} />
        )}
      </div>
    </>
  );
}
