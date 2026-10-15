// Màn Hóa đơn (POS-10, POS-11) cho quản lý / admin: xem order và hóa đơn của MỌI ngày (nhân viên chỉ xem được hôm nay).
// Chọn ngày, lọc trạng thái và nhân viên; dải số liệu và bảng tính trên các hóa đơn của ngày đó; bấm một hàng để xem chi tiết và in.
import { useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import DataTable from '../../components/DataTable.jsx';
import Pagination from '../../components/Pagination.jsx';
import { ChiSo } from '../../components/BieuDo.jsx';
import HoaDonPanel from './HoaDonPanel.jsx';
import { dsHoaDon } from '../../api/hoa-don.api.js';
import { dsNhanVien } from '../../api/nhan-su.api.js';
import { CHIP_TRANG_THAI_HD, PHUONG_THUC, TEN_TRANG_THAI_HD, congNgay, gioPhut, homNay, ngayNganGon, soThuong, tien } from '../../utils/format.js';
import { thongBaoLoi } from '../../utils/loi.js';

const MOI_TRANG = 12;
const TOI_DA = 200; // API trả tối đa 200 hóa đơn mỗi lần

export default function HoaDon() {
  const hom = homNay();
  const [ngay, setNgay] = useState(hom);
  const [trangThai, setTrangThai] = useState('');
  const [nv, setNv] = useState('');
  const [trang, setTrang] = useState(1);
  const [chon, setChon] = useState(null);

  const dsNv = useApi(() => dsNhanVien({ moi_trang: 100 }), []);
  const ds = useApi(() => dsHoaDon({ ngay, trang_thai: trangThai, ma_nhan_vien: nv, moi_trang: TOI_DA }), [ngay, trangThai, nv]);
  const dong = ds.data?.data ?? [];
  const tong = ds.data?.tong_so_ban_ghi ?? 0;
  const cat = tong > dong.length; // có hơn 200 hóa đơn: số liệu chỉ tính phần đã tải

  const daTT = dong.filter(d => d.trang_thai === 'da_thanh_toan');
  const doanhThu = daTT.reduce((s, d) => s + Number(d.tong_tien), 0);
  const dangXuLy = dong.filter(d => d.trang_thai === 'dang_pha_che' || d.trang_thai === 'da_phuc_vu').length;
  const huy = dong.filter(d => d.trang_thai === 'huy').length;

  const doi = setter => e => { setter(e.target.value); setTrang(1); setChon(null); };
  const doiNgay = v => { if (v) { setNgay(v); setTrang(1); setChon(null); } };
  const trangHienTai = dong.slice((trang - 1) * MOI_TRANG, trang * MOI_TRANG);
  const laHomNay = ngay === hom;

  const cot = [
    { khoa: 'so_thu_tu', tieuDe: 'Hóa đơn', hienThi: d => <><strong>#{d.so_thu_tu}</strong> <span className="goi-y">{gioPhut(d.thoi_gian_tao)}</span></> },
    { khoa: 'ten_nhan_vien', tieuDe: 'Nhân viên' },
    { khoa: 'ten_khach_hang', tieuDe: 'Khách', hienThi: d => d.ten_khach_hang ?? <span className="goi-y">Khách lẻ</span> },
    { khoa: 'trang_thai', tieuDe: 'Trạng thái', hienThi: d => (
      <>
        <span className={`chip ${CHIP_TRANG_THAI_HD[d.trang_thai]}`}>{TEN_TRANG_THAI_HD[d.trang_thai]}</span>
        {d.phuong_thuc_thanh_toan && <div className="goi-y">{PHUONG_THUC[d.phuong_thuc_thanh_toan] ?? d.phuong_thuc_thanh_toan}</div>}
      </>
    ) },
    { khoa: 'tong_tien', tieuDe: 'Tổng tiền', canPhai: true, hienThi: d => <strong>{tien(d.tong_tien)}</strong> },
  ];

  return (
    <>
      <div className="dau-trang">
        <div>
          <h1>Hóa đơn</h1>
          <p>{ds.loading && !ds.data ? 'Đang tải…' : `${tong} hóa đơn ngày ${ngayNganGon(ngay)}${laHomNay ? ' (hôm nay)' : ''}`}</p>
        </div>
      </div>

      <div className="bo-loc bo-loc-bc" role="group" aria-label="Bộ lọc hóa đơn">
        <div className="hang-nut" style={{ gap: 8, alignItems: 'center' }}>
          <button type="button" className="btn btn-sm" aria-label="Ngày trước" onClick={() => doiNgay(congNgay(ngay, -1))}>‹</button>
          <label htmlFor="hd-ngay" className="sr-only">Ngày</label>
          <input id="hd-ngay" className="o-nhap" type="date" value={ngay} max={hom} onChange={e => doiNgay(e.target.value)} />
          <button type="button" className="btn btn-sm" aria-label="Ngày sau" disabled={ngay >= hom} onClick={() => doiNgay(congNgay(ngay, 1))}>›</button>
          {!laHomNay && <button type="button" className="btn btn-sm" onClick={() => doiNgay(hom)}>Hôm nay</button>}
        </div>
        <div>
          <label htmlFor="hd-tt" className="sr-only">Trạng thái</label>
          <select id="hd-tt" className="o-nhap" value={trangThai} onChange={doi(setTrangThai)}>
            <option value="">Mọi trạng thái</option>
            {Object.entries(TEN_TRANG_THAI_HD).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="hd-nv" className="sr-only">Nhân viên</label>
          <select id="hd-nv" className="o-nhap" value={nv} onChange={doi(setNv)}>
            <option value="">Mọi nhân viên</option>
            {(dsNv.data?.data ?? []).map(n => <option key={n.ma_nhan_vien} value={n.ma_nhan_vien}>{n.ho_ten}</option>)}
          </select>
        </div>
      </div>

      {ds.error && <div className="banner banner-loi" role="alert"><span>{thongBaoLoi(ds.error)}</span><button type="button" className="link-nut" onClick={ds.reload}>Thử lại</button></div>}

      {ds.data && (
        <ChiSo muc={[
          { nhan: 'Doanh thu đã thanh toán', giaTri: tien(doanhThu), phu: `${soThuong(daTT.length)} hóa đơn` },
          { nhan: 'Đang xử lý', giaTri: soThuong(dangXuLy), phu: 'chưa thanh toán' },
          { nhan: 'Đã hủy', giaTri: soThuong(huy) },
        ]} />
      )}
      {cat && <div className="banner banner-canh-bao" role="status">Có {soThuong(tong)} hóa đơn nhưng chỉ tải {TOI_DA} đầu tiên, nên số liệu phía trên chỉ tính phần đã tải. Hãy lọc theo nhân viên hoặc trạng thái.</div>}

      <div className="hai-cot">
        <div className="the chinh">
          <DataTable tenBang="Danh sách hóa đơn" cot={cot} dong={trangHienTai} khoaDong="ma_hoa_don" dangChon={chon?.ma_hoa_don ?? null} dangTai={ds.loading}
                     onChonDong={setChon} trong={trangThai || nv ? 'Không có hóa đơn nào khớp bộ lọc' : 'Ngày này chưa có hóa đơn nào'} />
          <Pagination trang={trang} moiTrang={MOI_TRANG} tong={dong.length} onDoi={setTrang} />
        </div>
        {chon === null
          ? <aside className="the panel panel-rong">Chọn một hóa đơn trong bảng để xem chi tiết và in.</aside>
          : <HoaDonPanel key={chon.ma_hoa_don} ma={chon.ma_hoa_don} onDong={() => setChon(null)} />}
      </div>
    </>
  );
}
