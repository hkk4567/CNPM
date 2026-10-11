// SP-01: quản lý danh mục (thêm, đổi tên, xóa). Danh mục còn sản phẩm thì backend từ chối xóa (409).
import { useState } from 'react';
import Dialog from '../../components/Dialog.jsx';
import { taoDanhMuc, suaDanhMuc, xoaDanhMuc } from '../../api/san-pham.api.js';
import { thongBaoLoi } from '../../utils/loi.js';

export default function DanhMucDialog({ danhMuc, onDoi, onDong }) {
  const [moi, setMoi] = useState('');
  const [dangSua, setDangSua] = useState(null); // { ma, ten }
  const [loi, setLoi] = useState('');
  const [ban, setBan] = useState(false);

  async function chay(viec) {
    setBan(true); setLoi('');
    try { await viec(); await onDoi(); return true; } catch (e) { setLoi(thongBaoLoi(e)); return false; } finally { setBan(false); }
  }

  const them = async e => {
    e.preventDefault();
    if (!moi.trim()) { setLoi('Nhập tên danh mục'); return; }
    if (await chay(() => taoDanhMuc(moi.trim()))) setMoi('');
  };
  const luuTen = async () => {
    if (!dangSua.ten.trim()) { setLoi('Tên danh mục không được để trống'); return; }
    if (await chay(() => suaDanhMuc(dangSua.ma, dangSua.ten.trim()))) setDangSua(null);
  };

  return (
    <Dialog tieuDe="Quản lý danh mục" onDong={onDong} rong>
      {loi && <div className="banner banner-loi" role="alert">{loi}</div>}
      <ul className="ds-doc" aria-label="Danh sách danh mục">
        {danhMuc.map(d => (
          <li key={d.ma_danh_muc} style={{ alignItems: 'center' }}>
            {dangSua?.ma === d.ma_danh_muc ? (
              <>
                <input className="o-nhap" aria-label="Tên danh mục" value={dangSua.ten} data-autofocus
                       onChange={e => setDangSua({ ...dangSua, ten: e.target.value })}
                       onKeyDown={e => { if (e.key === 'Enter') luuTen(); }} />
                <span className="hang-nut" style={{ flexWrap: 'nowrap' }}>
                  <button type="button" className="btn btn-sm btn-primary" disabled={ban} onClick={luuTen}>Lưu</button>
                  <button type="button" className="btn btn-sm" disabled={ban} onClick={() => setDangSua(null)}>Hủy</button>
                </span>
              </>
            ) : (
              <>
                <span><strong>{d.ten_danh_muc}</strong> <span className="goi-y">({d.so_san_pham} sản phẩm)</span></span>
                <span className="hang-nut" style={{ flexWrap: 'nowrap' }}>
                  <button type="button" className="btn btn-sm" disabled={ban} onClick={() => { setLoi(''); setDangSua({ ma: d.ma_danh_muc, ten: d.ten_danh_muc }); }}>Đổi tên</button>
                  <button type="button" className="btn btn-sm btn-danger" disabled={ban || d.so_san_pham > 0}
                          title={d.so_san_pham > 0 ? 'Danh mục còn sản phẩm nên không xóa được' : undefined}
                          onClick={() => chay(() => xoaDanhMuc(d.ma_danh_muc))}>Xóa</button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={them} className="hang-nut" style={{ flexWrap: 'nowrap' }}>
        <label className="sr-only" htmlFor="dm-moi">Tên danh mục mới</label>
        <input id="dm-moi" className="o-nhap" placeholder="Tên danh mục mới" value={moi} onChange={e => setMoi(e.target.value)} />
        <button type="submit" className="btn btn-primary" disabled={ban}>Thêm</button>
      </form>
      <div className="hop-nut"><button type="button" className="btn" onClick={onDong}>Đóng</button></div>
    </Dialog>
  );
}
