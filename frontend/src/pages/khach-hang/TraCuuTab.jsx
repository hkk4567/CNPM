// KH-03 tìm khách, KH-01 thêm khách, KH-02 sửa khách, KH-04 lịch sử mua (trong panel bên phải).
// API tìm bắt buộc có từ khóa và trả tối đa 20 khách, nên chưa nhập gì thì chỉ hiện hướng dẫn.
import { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi.js';
import DataTable from '../../components/DataTable.jsx';
import Icon from '../../components/Icon.jsx';
import KhachPanel from './KhachPanel.jsx';
import { timKhach } from '../../api/khach-hang.api.js';
import { soThuong } from '../../utils/format.js';
import { thongBaoLoi } from '../../utils/loi.js';

const LA_SDT = /^\d{6,}$/;

export default function TraCuuTab() {
  const [o, setO] = useState('');
  const [tuKhoa, setTuKhoa] = useState('');
  const [chon, setChon] = useState(null); // null | 'them' | { khách đang xem }
  const [sdtGoiY, setSdtGoiY] = useState('');

  useEffect(() => { const t = setTimeout(() => setTuKhoa(o.trim()), 300); return () => clearTimeout(t); }, [o]);
  const kq = useApi(async () => (tuKhoa ? timKhach(tuKhoa) : []), [tuKhoa]);
  const dong = kq.data ?? [];

  const cot = [
    { khoa: 'ten_khach_hang', tieuDe: 'Khách hàng', hienThi: d => <strong>{d.ten_khach_hang}</strong> },
    { khoa: 'so_dien_thoai', tieuDe: 'Số điện thoại' },
    { khoa: 'diem_tich_luy', tieuDe: 'Điểm tích lũy', canPhai: true, hienThi: d => soThuong(d.diem_tich_luy) },
  ];
  const maDangChon = chon && chon !== 'them' ? chon.ma_khach_hang : null;
  const mo = (k, sdt = '') => { setSdtGoiY(sdt); setChon(k); };

  // Lưu xong: giữ khách vừa lưu trong panel (có thể không còn khớp từ khóa) và tải lại danh sách
  const daLuu = async khach => { setChon(khach); await kq.reload(); };

  let rong = 'Nhập tên hoặc số điện thoại để tìm khách';
  if (tuKhoa && !kq.loading) rong = `Không có khách nào khớp “${tuKhoa}”`;

  return (
    <>
      <div className="bo-loc">
        <div className="o-tim">
          <Icon ten="tim" size={18} />
          <label htmlFor="kh-tim" className="sr-only">Tìm khách theo tên hoặc số điện thoại</label>
          <input id="kh-tim" className="o-nhap" type="search" placeholder="Tên hoặc số điện thoại" value={o} onChange={e => setO(e.target.value)} autoComplete="off" />
        </div>
        <button type="button" className="btn btn-primary" onClick={() => mo('them')}>Thêm khách hàng</button>
      </div>

      {kq.error && <div className="banner banner-loi" role="alert"><span>{thongBaoLoi(kq.error)}</span><button type="button" className="link-nut" onClick={kq.reload}>Thử lại</button></div>}

      <div className="hai-cot">
        <div className="the chinh">
          <DataTable tenBang="Kết quả tìm khách" cot={cot} dong={dong} khoaDong="ma_khach_hang" dangChon={maDangChon} dangTai={kq.loading}
                     onChonDong={d => mo(d)} trong={rong} />
          {!kq.loading && tuKhoa && dong.length === 0 && (
            <div className="chu-thich" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>Khách mới? Thêm vào danh sách ngay.</span>
              <button type="button" className="btn btn-sm" onClick={() => mo('them', LA_SDT.test(tuKhoa) ? tuKhoa : '')}>Thêm khách hàng</button>
            </div>
          )}
          {dong.length >= 20 && <div className="chu-thich">Chỉ hiện 20 khách đầu tiên. Nhập thêm tên hoặc số điện thoại để thu hẹp kết quả.</div>}
        </div>

        {chon === null
          ? <aside className="the panel panel-rong">Chọn một khách trong bảng để sửa thông tin và xem lịch sử mua, hoặc bấm “Thêm khách hàng”.</aside>
          : <KhachPanel key={chon === 'them' ? `them-${sdtGoiY}` : chon.ma_khach_hang} khach={chon === 'them' ? null : chon} sdtGoiY={sdtGoiY} onDong={() => setChon(null)} onDaLuu={daLuu} />}
      </div>
    </>
  );
}
