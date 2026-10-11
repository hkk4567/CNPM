// KHO-05: lịch sử nhập (lọc theo ngày, nhà cung cấp), xem chi tiết một phiếu, và nút Lập phiếu nhập (KHO-04).
import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import DataTable from '../../components/DataTable.jsx';
import Pagination from '../../components/Pagination.jsx';
import Dialog from '../../components/Dialog.jsx';
import PhieuNhapForm from './PhieuNhapForm.jsx';
import { dsPhieuNhap, dsNcc, chiTietPhieuNhap } from '../../api/kho.api.js';
import { ngayGio, soThuong, tien } from '../../utils/format.js';
import { thongBaoLoi } from '../../utils/loi.js';

const MOI_TRANG = 10;

function ChiTiet({ ma, onDong }) {
  const ct = useApi(() => chiTietPhieuNhap(ma), [ma]);
  const p = ct.data;
  return (
    <Dialog tieuDe={`Phiếu nhập #${ma}`} onDong={onDong} rong>
      {ct.error && <div className="banner banner-loi" role="alert">{thongBaoLoi(ct.error)}</div>}
      {ct.loading && <p className="goi-y">Đang tải…</p>}
      {p && (
        <>
          <p className="goi-y">{p.ten_ncc} · {ngayGio(p.ngay_nhap)} · lập bởi {p.ten_nhan_vien}</p>
          <ul className="ds-doc">
            {p.chi_tiet.map(c => (
              <li key={c.ma_nguyen_lieu} style={{ flexDirection: 'column', gap: 2 }}>
                <span style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{c.ten_nguyen_lieu}</strong><strong style={{ fontVariantNumeric: 'tabular-nums' }}>{tien(c.thanh_tien)}</strong></span>
                <span className="goi-y" style={{ fontVariantNumeric: 'tabular-nums' }}>{soThuong(c.so_luong_nhap)} {c.don_vi_tinh} × {tien(c.don_gia_nhap)}</span>
              </li>
            ))}
          </ul>
          <div className="tong-tien"><span>Tổng tiền nhập</span><strong>{tien(p.tong_tien_nhap)}</strong></div>
        </>
      )}
      <div className="hop-nut"><button type="button" className="btn" data-autofocus onClick={onDong}>Đóng</button></div>
    </Dialog>
  );
}

export default function LichSuNhapTab() {
  const [loc, setLoc] = useState({ tu_ngay: '', den_ngay: '', ma_ncc: '', trang: 1 });
  const [xem, setXem] = useState(null);
  const [lap, setLap] = useState(false);
  const ncc = useApi(async () => (await dsNcc({ moi_trang: 100 })).data, []);
  const ds = useApi(() => dsPhieuNhap({ ...loc, moi_trang: MOI_TRANG }), [loc.tu_ngay, loc.den_ngay, loc.ma_ncc, loc.trang]);
  const dong = ds.data?.data ?? [];
  const tong = ds.data?.tong_so_ban_ghi ?? 0;
  const doi = k => e => setLoc(l => ({ ...l, [k]: e.target.value, trang: 1 }));
  const saiNgay = loc.tu_ngay && loc.den_ngay && loc.tu_ngay > loc.den_ngay;

  const cot = [
    { khoa: 'ma_phieu_nhap', tieuDe: 'Phiếu', hienThi: d => <strong>#{d.ma_phieu_nhap}</strong> },
    { khoa: 'ngay_nhap', tieuDe: 'Ngày nhập', hienThi: d => ngayGio(d.ngay_nhap) },
    { khoa: 'ten_ncc', tieuDe: 'Nhà cung cấp' },
    { khoa: 'ten_nhan_vien', tieuDe: 'Người lập' },
    { khoa: 'so_dong', tieuDe: 'Số dòng', canPhai: true },
    { khoa: 'tong_tien_nhap', tieuDe: 'Tổng tiền', canPhai: true, hienThi: d => <strong>{tien(d.tong_tien_nhap)}</strong> },
  ];

  return (
    <>
      <div className="bo-loc" style={{ alignItems: 'flex-end' }}>
        <div className="truong"><label htmlFor="ls-tu">Từ ngày</label><input id="ls-tu" type="date" className="o-nhap" value={loc.tu_ngay} onChange={doi('tu_ngay')} /></div>
        <div className="truong"><label htmlFor="ls-den">Đến ngày</label><input id="ls-den" type="date" className="o-nhap" value={loc.den_ngay} onChange={doi('den_ngay')} /></div>
        <div className="truong">
          <label htmlFor="ls-ncc">Nhà cung cấp</label>
          <select id="ls-ncc" className="o-nhap" value={loc.ma_ncc} onChange={doi('ma_ncc')}>
            <option value="">Tất cả</option>
            {(ncc.data ?? []).map(n => <option key={n.ma_ncc} value={n.ma_ncc}>{n.ten_ncc}</option>)}
          </select>
        </div>
        <button type="button" className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setLap(true)}>Lập phiếu nhập</button>
      </div>
      {saiNgay && <div className="banner banner-canh-bao" role="alert">“Từ ngày” đang sau “Đến ngày”, hãy chọn lại.</div>}
      {ds.error && !saiNgay && <div className="banner banner-loi" role="alert"><span>{thongBaoLoi(ds.error)}</span><button type="button" className="link-nut" onClick={ds.reload}>Thử lại</button></div>}

      <div className="the chinh" style={{ width: '100%' }}>
        <DataTable tenBang="Lịch sử nhập" cot={cot} dong={saiNgay ? [] : dong} khoaDong="ma_phieu_nhap" dangTai={ds.loading} onChonDong={d => setXem(d.ma_phieu_nhap)} trong="Chưa có phiếu nhập nào khớp bộ lọc" />
        <div className="phan-trang" style={{ borderTop: '1px solid var(--line)' }}>
          <span>Tổng tiền nhập (theo bộ lọc): <strong style={{ color: 'var(--ink)' }}>{tien(ds.data?.tong_tien_nhap ?? 0)}</strong></span>
        </div>
        <Pagination trang={loc.trang} moiTrang={MOI_TRANG} tong={tong} onDoi={t => setLoc(l => ({ ...l, trang: t }))} />
      </div>

      {xem && <ChiTiet ma={xem} onDong={() => setXem(null)} />}
      {lap && (
        <Dialog tieuDe="Lập phiếu nhập" onDong={() => setLap(false)} rong>
          <PhieuNhapForm onXong={() => { setLap(false); ds.reload(); }} />
        </Dialog>
      )}
    </>
  );
}
