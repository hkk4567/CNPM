// Panel thêm nhân viên (NS-01, chỉ admin) / sửa thông tin (NS-02) / xóa hoặc cho nghỉ việc (NS-03, chỉ admin).
// Quản lý chỉ sửa họ tên, chức vụ, SĐT và không sửa được tài khoản admin (backend trả 403); giao diện khóa form trước cho khỏi bấm nhầm.
import { useEffect, useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Truong from '../../components/Truong.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { taoNhanVien, suaNhanVien, xoaNhanVien } from '../../api/nhan-su.api.js';
import { TEN_QUYEN } from '../../utils/format.js';
import { loiTheoTruong, thongBaoLoi } from '../../utils/loi.js';

export const kiemTraMatKhau = mk => {
  if (mk.length < 8 || new TextEncoder().encode(mk).length > 72) return 'Mật khẩu dài 8–72 ký tự';
  if (!/[A-Za-z]/.test(mk) || !/\d/.test(mk)) return 'Mật khẩu cần ít nhất một chữ cái và một chữ số';
  return '';
};

const tuNv = nv => ({ ten: nv?.ho_ten ?? '', chucVu: nv?.chuc_vu ?? '', sdt: nv?.so_dien_thoai ?? '', dn: '', mk: '', quyen: 'nhan_vien' });

function kiemTra(f, them) {
  const l = {};
  if (!f.ten.trim()) l.ho_ten = 'Nhập họ tên'; else if (f.ten.trim().length > 100) l.ho_ten = 'Họ tên tối đa 100 ký tự';
  if (!f.chucVu.trim()) l.chuc_vu = 'Nhập chức vụ'; else if (f.chucVu.trim().length > 50) l.chuc_vu = 'Chức vụ tối đa 50 ký tự';
  if (f.sdt.trim() && !/^0\d{9,10}$/.test(f.sdt.trim())) l.so_dien_thoai = 'Số điện thoại gồm 10–11 chữ số, bắt đầu bằng 0';
  if (them) {
    if (!/^[A-Za-z0-9._-]{3,50}$/.test(f.dn.trim())) l.ten_dang_nhap = 'Tên đăng nhập 3–50 ký tự: chữ không dấu, số, dấu chấm, gạch dưới, gạch ngang';
    const m = kiemTraMatKhau(f.mk); if (m) l.mat_khau = m;
  }
  return l;
}

export default function NhanVienPanel({ nv, onDaLuu, onDaXoa, onDong }) {
  const { nguoiDung } = useAuth();
  const { thongBao } = useToast();
  const laAdmin = nguoiDung.quyen_truy_cap === 'admin';
  const them = !nv;
  const khoa = !them && !laAdmin && nv.quyen_truy_cap === 'admin';
  const laMinh = !them && nv.ma_nhan_vien === nguoiDung.ma_nhan_vien;
  const [f, setF] = useState(() => tuNv(nv));
  const [loi, setLoi] = useState({});
  const [loiChung, setLoiChung] = useState('');
  const [ban, setBan] = useState(false);
  const [hoiXoa, setHoiXoa] = useState(false);

  useEffect(() => { setF(tuNv(nv)); setLoi({}); setLoiChung(''); }, [nv?.ma_nhan_vien, nv?.ho_ten, nv?.chuc_vu, nv?.so_dien_thoai]);
  const dat = k => e => setF(x => ({ ...x, [k]: e.target.value }));

  async function luu(e) {
    e.preventDefault();
    const l = kiemTra(f, them);
    setLoi(l); setLoiChung('');
    if (Object.keys(l).length) return;
    setBan(true);
    try {
      let kq;
      if (them) {
        kq = await taoNhanVien({ ho_ten: f.ten.trim(), chuc_vu: f.chucVu.trim(), ...(f.sdt.trim() ? { so_dien_thoai: f.sdt.trim() } : {}), ten_dang_nhap: f.dn.trim(), mat_khau: f.mk, quyen_truy_cap: f.quyen });
      } else {
        kq = await suaNhanVien(nv.ma_nhan_vien, { ho_ten: f.ten.trim(), chuc_vu: f.chucVu.trim(), so_dien_thoai: f.sdt.trim() || null });
      }
      thongBao(them ? 'Đã thêm nhân viên' : 'Đã lưu thay đổi');
      onDaLuu(kq);
    } catch (err) {
      const t = loiTheoTruong(err);
      if (err.ma === 'TRUNG_TEN_DANG_NHAP') t.ten_dang_nhap = 'Tên đăng nhập này đã có người dùng';
      setLoi(t); setLoiChung(thongBaoLoi(err));
    } finally { setBan(false); }
  }

  async function xoa() {
    setBan(true);
    try {
      const kq = await xoaNhanVien(nv.ma_nhan_vien);
      thongBao(kq.da_xoa ? 'Đã xóa nhân viên' : 'Nhân viên đã có lịch sử nên được chuyển sang nghỉ việc');
      setHoiXoa(false); onDaXoa(kq);
    } catch (err) { setHoiXoa(false); setLoiChung(thongBaoLoi(err)); } finally { setBan(false); }
  }

  return (
    <aside className="the panel" aria-label={them ? 'Thêm nhân viên' : 'Sửa nhân viên'}>
      <div className="hang-dau">
        <h2>{them ? 'Thêm nhân viên' : nv.ho_ten}</h2>
        <button type="button" className="icon-btn" style={{ width: 36, height: 36 }} aria-label="Đóng panel" onClick={onDong}>×</button>
      </div>
      {khoa && <div className="banner banner-canh-bao">Quản lý không sửa được thông tin của tài khoản admin.</div>}
      {!them && nv.trang_thai === 'nghi_viec' && <div className="banner banner-canh-bao">Nhân viên đã nghỉ việc: không đăng nhập và không xếp ca được.</div>}
      {loiChung && <div className="banner banner-loi" role="alert">{loiChung}</div>}
      <form onSubmit={luu} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <fieldset disabled={khoa} style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <Truong id="nv-ten" nhan="Họ tên" loi={loi.ho_ten}>{p => <input {...p} className="o-nhap" value={f.ten} onChange={dat('ten')} autoFocus={them} />}</Truong>
          <Truong id="nv-cv" nhan="Chức vụ" loi={loi.chuc_vu}>{p => <input {...p} className="o-nhap" value={f.chucVu} onChange={dat('chucVu')} />}</Truong>
          <Truong id="nv-sdt" nhan="Số điện thoại (không bắt buộc)" loi={loi.so_dien_thoai}>{p => <input {...p} className="o-nhap" type="tel" inputMode="tel" value={f.sdt} onChange={dat('sdt')} />}</Truong>
          {them && (
            <>
              <Truong id="nv-dn" nhan="Tên đăng nhập" loi={loi.ten_dang_nhap} goiY="Không đổi được sau khi tạo">{p => <input {...p} className="o-nhap" autoComplete="off" value={f.dn} onChange={dat('dn')} />}</Truong>
              <Truong id="nv-mk" nhan="Mật khẩu ban đầu" loi={loi.mat_khau} goiY="8–72 ký tự, có chữ cái và chữ số">{p => <input {...p} className="o-nhap" type="password" autoComplete="new-password" value={f.mk} onChange={dat('mk')} />}</Truong>
              <fieldset className="truong" style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="nhan" style={{ padding: 0, marginBottom: 8 }}>Quyền truy cập</legend>
                <div className="nhom-radio">
                  {Object.entries(TEN_QUYEN).map(([v, t]) => <label key={v} className="radio-the"><input type="radio" name="nv-quyen" value={v} checked={f.quyen === v} onChange={dat('quyen')} />{t}</label>)}
                </div>
              </fieldset>
            </>
          )}
        </fieldset>
        {!khoa && <button type="submit" className="btn btn-primary btn-block" disabled={ban}>{ban ? 'Đang lưu…' : (them ? 'Thêm nhân viên' : 'Lưu thay đổi')}</button>}
      </form>

      {!them && (
        <div className="so-lieu"><span>Tài khoản</span><strong style={{ fontSize: 15 }}>{nv.ten_dang_nhap ? `${nv.ten_dang_nhap} · ${TEN_QUYEN[nv.quyen_truy_cap]}` : 'Chưa có tài khoản'}</strong></div>
      )}
      {!them && laAdmin && nv.trang_thai === 'dang_lam' && (laMinh
        ? <p className="goi-y">Bạn không thể tự xóa hoặc cho chính mình nghỉ việc.</p>
        : <button type="button" className="btn btn-danger btn-block" disabled={ban} onClick={() => setHoiXoa(true)}>Xóa hoặc cho nghỉ việc</button>)}
      {hoiXoa && (
        <ConfirmDialog tieuDe="Xóa nhân viên?" nguyHiem nhanXacNhan="Xác nhận" dangXuLy={ban}
          noiDung={`Nếu ${nv.ho_ten} chưa có hóa đơn, phiếu nhập hay ca làm cũ thì sẽ bị xóa hẳn cùng tài khoản. Nếu đã có thì chuyển sang nghỉ việc: chặn đăng nhập và gỡ các ca từ hôm nay trở đi.`}
          onXacNhan={xoa} onHuy={() => setHoiXoa(false)} />
      )}
    </aside>
  );
}
