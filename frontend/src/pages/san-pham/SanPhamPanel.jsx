// Panel bên phải: thêm hoặc sửa một sản phẩm (SP-02, SP-03), cho ngừng bán, xóa (SP-04) và công thức.
import { useEffect, useState } from 'react';
import { useToast } from '../../components/Toast.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import CongThucEditor from './CongThucEditor.jsx';
import { taoSanPham, suaSanPham, xoaSanPham } from '../../api/san-pham.api.js';
import { loiTheoTruong, thongBaoLoi } from '../../utils/loi.js';

const tuSanPham = sp => (sp
  ? { ten: sp.ten_san_pham, danhMuc: String(sp.ma_danh_muc), gia: String(Number(sp.gia_ban)), trangThai: sp.trang_thai }
  : { ten: '', danhMuc: '', gia: '', trangThai: 'con_ban' });

function kiemTra(f) {
  const l = {};
  if (!f.ten.trim()) l.ten_san_pham = 'Nhập tên sản phẩm';
  else if (f.ten.trim().length > 150) l.ten_san_pham = 'Tên tối đa 150 ký tự';
  if (!f.danhMuc) l.ma_danh_muc = 'Chọn danh mục';
  if (f.gia === '' || Number.isNaN(Number(f.gia))) l.gia_ban = 'Nhập giá bán';
  else if (Number(f.gia) < 0) l.gia_ban = 'Giá bán không được âm';
  return l;
}

export default function SanPhamPanel({ sanPham, danhMuc, nguyenLieu, onDaLuu, onDaXoa, onDaDoiCongThuc, onDong }) {
  const { thongBao } = useToast();
  const them = !sanPham;
  const [f, setF] = useState(() => tuSanPham(sanPham));
  const [loi, setLoi] = useState({});
  const [loiChung, setLoiChung] = useState('');
  const [ban, setBan] = useState(false);
  const [hoiXoa, setHoiXoa] = useState(false);

  // Dữ liệu đã lưu đổi (sau khi lưu / tải lại) thì nạp lại form
  useEffect(() => { setF(tuSanPham(sanPham)); setLoi({}); setLoiChung(''); },
    [sanPham?.ma_san_pham, sanPham?.ten_san_pham, sanPham?.ma_danh_muc, sanPham?.gia_ban, sanPham?.trang_thai]);

  const dat = k => e => setF(x => ({ ...x, [k]: e.target.value }));

  async function luu(du) {
    const l = kiemTra(du);
    setLoi(l); setLoiChung('');
    if (Object.keys(l).length) return;
    setBan(true);
    const body = { ma_danh_muc: Number(du.danhMuc), ten_san_pham: du.ten.trim(), gia_ban: Number(du.gia), trang_thai: du.trangThai };
    try {
      const kq = them ? await taoSanPham(body) : await suaSanPham(sanPham.ma_san_pham, body);
      thongBao(them ? 'Đã thêm sản phẩm' : 'Đã lưu thay đổi');
      onDaLuu(kq);
    } catch (e) {
      setLoi(loiTheoTruong(e)); setLoiChung(thongBaoLoi(e));
    } finally { setBan(false); }
  }

  async function xoa() {
    setBan(true);
    try {
      await xoaSanPham(sanPham.ma_san_pham);
      thongBao('Đã xóa sản phẩm');
      setHoiXoa(false);
      onDaXoa();
    } catch (e) {
      setHoiXoa(false);
      setLoiChung(thongBaoLoi(e)); // ví dụ 409 SAN_PHAM_DA_BAN: đã bán thì chỉ được ngừng bán
    } finally { setBan(false); }
  }

  const truong = (k, nhan, noiDung) => (
    <div className="truong">
      <label htmlFor={`sp-${k}`}>{nhan}</label>
      {noiDung}
      {loi[k] && <span className="loi-truong" id={`sp-${k}-loi`}>{loi[k]}</span>}
    </div>
  );
  const thuocTinh = k => ({ id: `sp-${k}`, 'aria-invalid': !!loi[k], 'aria-describedby': loi[k] ? `sp-${k}-loi` : undefined });

  return (
    <aside className="the panel" aria-label={them ? 'Thêm sản phẩm' : 'Sửa sản phẩm'}>
      <div className="hang-dau">
        <h2>{them ? 'Thêm sản phẩm' : `Sửa ${sanPham.ten_san_pham}`}</h2>
        <button type="button" className="icon-btn" style={{ width: 36, height: 36 }} aria-label="Đóng panel" onClick={onDong}>×</button>
      </div>
      {loiChung && <div className="banner banner-loi" role="alert">{loiChung}</div>}
      <form onSubmit={e => { e.preventDefault(); luu(f); }} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {truong('ten_san_pham', 'Tên sản phẩm', <input {...thuocTinh('ten_san_pham')} className="o-nhap" value={f.ten} onChange={dat('ten')} autoFocus={them} />)}
        {truong('ma_danh_muc', 'Danh mục', (
          <select {...thuocTinh('ma_danh_muc')} className="o-nhap" value={f.danhMuc} onChange={dat('danhMuc')}>
            <option value="">Chọn danh mục</option>
            {danhMuc.map(d => <option key={d.ma_danh_muc} value={d.ma_danh_muc}>{d.ten_danh_muc}</option>)}
          </select>
        ))}
        {truong('gia_ban', 'Giá bán (đồng)', <input {...thuocTinh('gia_ban')} className="o-nhap" type="number" min="0" step="500" inputMode="numeric" value={f.gia} onChange={dat('gia')} />)}
        <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="truong">
          <legend className="nhan" style={{ padding: 0, marginBottom: 8 }}>Trạng thái</legend>
          <div className="nhom-radio">
            {[['con_ban', 'Đang bán'], ['ngung_ban', 'Ngừng bán']].map(([v, t]) => (
              <label key={v} className="radio-the"><input type="radio" name="trang-thai" value={v} checked={f.trangThai === v} onChange={dat('trangThai')} />{t}</label>
            ))}
          </div>
        </fieldset>

        {!them && <CongThucEditor maSanPham={sanPham.ma_san_pham} nguyenLieu={nguyenLieu} onDaDoi={onDaDoiCongThuc} />}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button type="submit" className="btn btn-primary btn-block" disabled={ban}>{ban ? 'Đang lưu…' : (them ? 'Thêm sản phẩm' : 'Lưu thay đổi')}</button>
          {!them && (
            <>
              <button type="button" className="btn btn-block" disabled={ban}
                      onClick={() => luu({ ...f, trangThai: sanPham.trang_thai === 'con_ban' ? 'ngung_ban' : 'con_ban' })}>
                {sanPham.trang_thai === 'con_ban' ? 'Cho ngừng bán' : 'Cho bán lại'}
              </button>
              <button type="button" className="btn btn-danger btn-block" disabled={ban} onClick={() => setHoiXoa(true)}>Xóa sản phẩm</button>
              <p className="goi-y">Sản phẩm đã có trong hóa đơn không xóa được, chỉ cho ngừng bán.</p>
            </>
          )}
        </div>
      </form>
      {hoiXoa && (
        <ConfirmDialog tieuDe="Xóa sản phẩm?" nguyHiem nhanXacNhan="Xóa" dangXuLy={ban}
                       noiDung={`Xóa “${sanPham.ten_san_pham}” cùng công thức và liên kết khuyến mãi của nó. Không hoàn tác được.`}
                       onXacNhan={xoa} onHuy={() => setHoiXoa(false)} />
      )}
    </aside>
  );
}
