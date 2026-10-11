// AUTH-02: hộp thoại đổi mật khẩu của chính người đang đăng nhập.
import { useState } from 'react';
import Dialog from '../../components/Dialog.jsx';
import { useToast } from '../../components/Toast.jsx';
import { doiMatKhau } from '../../api/auth.api.js';
import { thongBaoLoi } from '../../utils/loi.js';

// Cùng quy tắc với backend: 8–72 ký tự, có chữ cái và chữ số
function kiemTra({ cu, moi, nhapLai }) {
  const loi = {};
  if (!cu) loi.cu = 'Nhập mật khẩu hiện tại';
  if (moi.length < 8) loi.moi = 'Mật khẩu mới tối thiểu 8 ký tự';
  else if (new TextEncoder().encode(moi).length > 72) loi.moi = 'Mật khẩu mới quá dài (tối đa 72 byte)';
  else if (!/\p{L}/u.test(moi) || !/\d/.test(moi)) loi.moi = 'Mật khẩu mới phải có ít nhất một chữ cái và một chữ số';
  else if (moi === cu) loi.moi = 'Mật khẩu mới phải khác mật khẩu hiện tại';
  if (nhapLai !== moi) loi.nhapLai = 'Hai mật khẩu mới chưa giống nhau';
  return loi;
}

export default function DoiMatKhau({ onDong }) {
  const { thongBao } = useToast();
  const [f, setF] = useState({ cu: '', moi: '', nhapLai: '' });
  const [loi, setLoi] = useState({});
  const [loiChung, setLoiChung] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const dat = k => e => setF(x => ({ ...x, [k]: e.target.value }));

  async function gui(e) {
    e.preventDefault();
    const l = kiemTra(f);
    setLoi(l); setLoiChung('');
    if (Object.keys(l).length) return;
    setDangGui(true);
    try {
      await doiMatKhau(f.cu, f.moi);
      thongBao('Đã đổi mật khẩu');
      onDong();
    } catch (err) {
      setLoiChung(thongBaoLoi(err));
      setDangGui(false);
    }
  }

  const o = (k, ten, nhan, auto) => (
    <div className="truong">
      <label htmlFor={`mk-${k}`}>{nhan}</label>
      <input id={`mk-${k}`} className="o-nhap" type="password" autoComplete={auto} value={f[k]} onChange={dat(k)}
             aria-invalid={!!loi[k]} aria-describedby={loi[k] ? `mk-${k}-loi` : undefined} data-autofocus={k === 'cu' ? true : undefined} />
      {loi[k] && <span id={`mk-${k}-loi`} className="loi-truong">{loi[k]}</span>}
    </div>
  );

  return (
    <Dialog tieuDe="Đổi mật khẩu" onDong={onDong}>
      <form onSubmit={gui} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loiChung && <div className="banner banner-loi" role="alert">{loiChung}</div>}
        {o('cu', 'cu', 'Mật khẩu hiện tại', 'current-password')}
        {o('moi', 'moi', 'Mật khẩu mới', 'new-password')}
        <p className="goi-y" style={{ marginTop: -8 }}>Tối thiểu 8 ký tự, có chữ cái và chữ số.</p>
        {o('nhapLai', 'nhapLai', 'Nhập lại mật khẩu mới', 'new-password')}
        <div className="hop-nut">
          <button type="button" className="btn" onClick={onDong} disabled={dangGui}>Hủy</button>
          <button type="submit" className="btn btn-primary" disabled={dangGui}>{dangGui ? 'Đang lưu…' : 'Đổi mật khẩu'}</button>
        </div>
      </form>
    </Dialog>
  );
}
