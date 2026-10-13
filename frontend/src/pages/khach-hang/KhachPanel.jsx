// Panel thêm khách (KH-01) / sửa khách (KH-02) kèm lịch sử mua (KH-04). Điểm tích lũy chỉ xem: backend cấm sửa trực tiếp.
import { useEffect, useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import Truong from '../../components/Truong.jsx';
import LichSuMua from './LichSuMua.jsx';
import { taoKhach, suaKhach } from '../../api/khach-hang.api.js';
import { soThuong } from '../../utils/format.js';
import { loiTheoTruong, thongBaoLoi } from '../../utils/loi.js';

const tuKhach = (k, sdt) => ({ ten: k?.ten_khach_hang ?? '', sdt: k?.so_dien_thoai ?? sdt ?? '' });

function kiemTra(f) {
  const l = {};
  if (!f.ten.trim()) l.ten_khach_hang = 'Nhập tên khách hàng';
  else if (f.ten.trim().length > 100) l.ten_khach_hang = 'Tên tối đa 100 ký tự';
  if (!/^0\d{9}$/.test(f.sdt.trim())) l.so_dien_thoai = 'Số điện thoại gồm 10 chữ số và bắt đầu bằng 0';
  return l;
}

export default function KhachPanel({ khach, sdtGoiY, onDaLuu, onDong }) {
  const { thongBao } = useToast();
  const them = !khach;
  const [f, setF] = useState(() => tuKhach(khach, sdtGoiY));
  const [loi, setLoi] = useState({});
  const [loiChung, setLoiChung] = useState('');
  const [ban, setBan] = useState(false);

  useEffect(() => { setF(tuKhach(khach, sdtGoiY)); setLoi({}); setLoiChung(''); },
    [khach?.ma_khach_hang, khach?.ten_khach_hang, khach?.so_dien_thoai, sdtGoiY]);
  const dat = k => e => setF(x => ({ ...x, [k]: e.target.value }));

  async function luu(e) {
    e.preventDefault();
    const l = kiemTra(f);
    setLoi(l); setLoiChung('');
    if (Object.keys(l).length) return;
    setBan(true);
    const body = { ten_khach_hang: f.ten.trim(), so_dien_thoai: f.sdt.trim() };
    try {
      const kq = them ? await taoKhach(body) : await suaKhach(khach.ma_khach_hang, body);
      thongBao(them ? 'Đã thêm khách hàng' : 'Đã lưu thay đổi');
      onDaLuu(kq);
    } catch (err) {
      const t = loiTheoTruong(err);
      if (err.ma === 'TRUNG_SDT') t.so_dien_thoai = 'Số điện thoại này đã có khách hàng khác';
      setLoi(t); setLoiChung(thongBaoLoi(err));
    } finally { setBan(false); }
  }

  return (
    <aside className="the panel" aria-label={them ? 'Thêm khách hàng' : 'Sửa khách hàng'}>
      <div className="hang-dau">
        <h2>{them ? 'Thêm khách hàng' : khach.ten_khach_hang}</h2>
        <button type="button" className="icon-btn" style={{ width: 36, height: 36 }} aria-label="Đóng panel" onClick={onDong}>×</button>
      </div>
      {loiChung && <div className="banner banner-loi" role="alert">{loiChung}</div>}
      {!them && <div className="luoi-so-lieu"><div className="so-lieu"><span>Điểm tích lũy</span><strong>{soThuong(khach.diem_tich_luy)}</strong></div></div>}
      <form onSubmit={luu} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Truong id="kh-ten" nhan="Tên khách hàng" loi={loi.ten_khach_hang}>{p => <input {...p} className="o-nhap" value={f.ten} onChange={dat('ten')} autoFocus={them} />}</Truong>
        <Truong id="kh-sdt" nhan="Số điện thoại" loi={loi.so_dien_thoai} goiY={them ? 'Điểm bắt đầu từ 0 và tăng khi khách thanh toán' : 'Điểm không sửa trực tiếp được'}>
          {p => <input {...p} className="o-nhap" type="tel" inputMode="tel" value={f.sdt} onChange={dat('sdt')} />}
        </Truong>
        <button type="submit" className="btn btn-primary btn-block" disabled={ban}>{ban ? 'Đang lưu…' : (them ? 'Thêm khách hàng' : 'Lưu thay đổi')}</button>
      </form>
      {!them && <LichSuMua ma={khach.ma_khach_hang} />}
    </aside>
  );
}
