// Panel thêm/sửa khuyến mãi (KM-01, KM-02), xóa (KM-03), sản phẩm áp dụng (KM-04/05) và hiệu quả (KM-07).
import { useEffect, useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Truong from '../../components/Truong.jsx';
import SanPhamApDung from './SanPhamApDung.jsx';
import HieuQua from './HieuQua.jsx';
import { taoKhuyenMai, suaKhuyenMai, xoaKhuyenMai } from '../../api/khuyen-mai.api.js';
import { sangOGioNhap, tuOGioNhap } from '../../utils/format.js';
import { loiTheoTruong, thongBaoLoi } from '../../utils/loi.js';

const macDinh = () => ({ ten: '', loai: 'phan_tram', gia: '', bd: sangOGioNhap(new Date()), kt: sangOGioNhap(new Date(Date.now() + 30 * 864e5)) });
const tuKm = k => (k ? { ten: k.ten_khuyen_mai, loai: k.loai_giam, gia: String(Number(k.gia_tri_giam)), bd: sangOGioNhap(k.ngay_bat_dau), kt: sangOGioNhap(k.ngay_ket_thuc) } : macDinh());

function kiemTra(f) {
  const l = {};
  if (!f.ten.trim()) l.ten_khuyen_mai = 'Nhập tên khuyến mãi';
  const g = Number(f.gia);
  if (f.gia === '' || !(g > 0)) l.gia_tri_giam = 'Mức giảm phải lớn hơn 0';
  else if (f.loai === 'phan_tram' && g > 100) l.gia_tri_giam = 'Giảm theo phần trăm tối đa 100';
  if (!f.bd) l.ngay_bat_dau = 'Chọn thời điểm bắt đầu';
  if (!f.kt) l.ngay_ket_thuc = 'Chọn thời điểm kết thúc';
  if (f.bd && f.kt && new Date(f.bd) >= new Date(f.kt)) l.ngay_bat_dau = 'Thời điểm bắt đầu phải trước thời điểm kết thúc';
  return l;
}

export default function KhuyenMaiPanel({ km, tatCaSanPham, onDaLuu, onDaXoa, onDoi, onDong }) {
  const { thongBao } = useToast();
  const them = !km;
  const [f, setF] = useState(() => tuKm(km));
  const [chonSp, setChonSp] = useState(() => new Set());
  const [loi, setLoi] = useState({});
  const [loiChung, setLoiChung] = useState('');
  const [daDung, setDaDung] = useState(false);
  const [ban, setBan] = useState(false);
  const [hoiXoa, setHoiXoa] = useState(false);

  useEffect(() => { setF(tuKm(km)); setLoi({}); setLoiChung(''); setDaDung(false); },
    [km?.ma_khuyen_mai, km?.ten_khuyen_mai, km?.loai_giam, km?.gia_tri_giam, km?.ngay_bat_dau, km?.ngay_ket_thuc]);
  const dat = k => e => setF(x => ({ ...x, [k]: e.target.value }));

  async function luu(e) {
    e.preventDefault();
    const l = kiemTra(f);
    setLoi(l); setLoiChung('');
    if (Object.keys(l).length) return;
    setBan(true);
    const body = { ten_khuyen_mai: f.ten.trim(), loai_giam: f.loai, gia_tri_giam: Number(f.gia), ngay_bat_dau: tuOGioNhap(f.bd), ngay_ket_thuc: tuOGioNhap(f.kt) };
    try {
      const kq = them ? await taoKhuyenMai({ ...body, ...(chonSp.size ? { ma_san_pham: [...chonSp] } : {}) }) : await suaKhuyenMai(km.ma_khuyen_mai, body);
      thongBao(them ? 'Đã tạo khuyến mãi' : 'Đã lưu thay đổi');
      onDaLuu(kq);
    } catch (err) { setLoi(loiTheoTruong(err)); setLoiChung(thongBaoLoi(err)); } finally { setBan(false); }
  }

  async function xoa() {
    setBan(true);
    try { await xoaKhuyenMai(km.ma_khuyen_mai); thongBao('Đã xóa khuyến mãi'); setHoiXoa(false); onDaXoa(); }
    catch (err) { setHoiXoa(false); setLoiChung(thongBaoLoi(err)); setDaDung(err.ma === 'KHUYEN_MAI_DA_DUOC_DUNG'); } finally { setBan(false); }
  }

  // Khuyến mãi đã dùng không xóa được: cách ngừng áp dụng là đặt ngày kết thúc về hiện tại (theo gợi ý của backend)
  async function ngungApDung() {
    setBan(true);
    try { const kq = await suaKhuyenMai(km.ma_khuyen_mai, { ngay_ket_thuc: new Date().toISOString() }); thongBao('Đã ngừng áp dụng khuyến mãi'); setDaDung(false); setLoiChung(''); onDaLuu(kq); }
    catch (err) { setLoiChung(thongBaoLoi(err)); } finally { setBan(false); }
  }

  const doiSp = ma => setChonSp(s => { const m = new Set(s); if (m.has(ma)) m.delete(ma); else m.add(ma); return m; });

  return (
    <aside className="the panel" aria-label={them ? 'Thêm khuyến mãi' : 'Sửa khuyến mãi'}>
      <div className="hang-dau">
        <h2>{them ? 'Thêm khuyến mãi' : `Sửa ${km.ten_khuyen_mai}`}</h2>
        <button type="button" className="icon-btn" style={{ width: 36, height: 36 }} aria-label="Đóng panel" onClick={onDong}>×</button>
      </div>
      {loiChung && (
        <div className="banner banner-loi" role="alert">
          <span>{loiChung}</span>
          {daDung && <button type="button" className="btn btn-sm" disabled={ban} onClick={ngungApDung}>Ngừng áp dụng ngay</button>}
        </div>
      )}
      <form onSubmit={luu} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Truong id="km-ten" nhan="Tên khuyến mãi" loi={loi.ten_khuyen_mai}>{p => <input {...p} className="o-nhap" value={f.ten} onChange={dat('ten')} autoFocus={them} />}</Truong>
        <fieldset className="truong" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="nhan" style={{ padding: 0, marginBottom: 8 }}>Loại giảm</legend>
          <div className="nhom-radio">
            {[['phan_tram', 'Theo phần trăm'], ['so_tien', 'Theo số tiền']].map(([v, t]) => (
              <label key={v} className="radio-the"><input type="radio" name="loai-giam" value={v} checked={f.loai === v} onChange={dat('loai')} />{t}</label>
            ))}
          </div>
        </fieldset>
        <Truong id="km-gia" nhan={f.loai === 'phan_tram' ? 'Giảm (%)' : 'Giảm (đồng mỗi ly)'} loi={loi.gia_tri_giam} goiY="Mức giảm tính trên giá gốc, mỗi ly; nhiều khuyến mãi cùng sản phẩm thì cộng dồn">
          {p => <input {...p} className="o-nhap" type="number" min="0" step="any" inputMode="decimal" value={f.gia} onChange={dat('gia')} />}
        </Truong>
        <Truong id="km-bd" nhan="Bắt đầu" loi={loi.ngay_bat_dau}>{p => <input {...p} className="o-nhap" type="datetime-local" value={f.bd} onChange={dat('bd')} />}</Truong>
        <Truong id="km-kt" nhan="Kết thúc" loi={loi.ngay_ket_thuc}>{p => <input {...p} className="o-nhap" type="datetime-local" value={f.kt} onChange={dat('kt')} />}</Truong>

        {them && (
          <fieldset className="truong" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="nhan" style={{ padding: 0, marginBottom: 8 }}>Sản phẩm áp dụng (không bắt buộc)</legend>
            <div className="hop-chon">
              {tatCaSanPham.map(s => (
                <label key={s.ma_san_pham} className="o-chon"><input type="checkbox" checked={chonSp.has(s.ma_san_pham)} onChange={() => doiSp(s.ma_san_pham)} />{s.ten_san_pham}</label>
              ))}
              {!tatCaSanPham.length && <span className="goi-y">Chưa có sản phẩm</span>}
            </div>
          </fieldset>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button type="submit" className="btn btn-primary btn-block" disabled={ban}>{ban ? 'Đang lưu…' : (them ? 'Tạo khuyến mãi' : 'Lưu thay đổi')}</button>
        </div>
      </form>

      {!them && (
        <>
          <SanPhamApDung ma={km.ma_khuyen_mai} tatCaSanPham={tatCaSanPham} onDoi={onDoi} />
          <HieuQua ma={km.ma_khuyen_mai} />
          <button type="button" className="btn btn-danger btn-block" disabled={ban} onClick={() => setHoiXoa(true)}>Xóa khuyến mãi</button>
          <p className="goi-y">Khuyến mãi đã áp vào hóa đơn thì không xóa được, chỉ ngừng áp dụng.</p>
        </>
      )}
      {hoiXoa && <ConfirmDialog tieuDe="Xóa khuyến mãi?" nguyHiem nhanXacNhan="Xóa" dangXuLy={ban} noiDung={`Xóa “${km.ten_khuyen_mai}” cùng danh sách sản phẩm áp dụng. Không hoàn tác được.`} onXacNhan={xoa} onHuy={() => setHoiXoa(false)} />}
    </aside>
  );
}
