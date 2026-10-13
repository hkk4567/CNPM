// Bốn báo cáo dạng xếp hạng dùng chung một khung: BC-02 sản phẩm bán chạy, BC-03 doanh thu theo danh mục, BC-04 phương thức thanh toán, BC-06 theo nhân viên.
// Mỗi báo cáo là một cấu hình: gọi API nào, lấy tên/giá trị vẽ thanh ra sao, cột của bảng, và dải số liệu đầu trang.
import { useApi } from '../../hooks/useApi.js';
import { sanPhamBanChay, theoDanhMuc, theoNhanVien, theoPhuongThuc } from '../../api/bao-cao.api.js';
import { BangSo, ChiSo, MAU, ThanhNgang, TheBieuDo } from '../../components/BieuDo.jsx';
import { PHUONG_THUC, phanTram, soThuong, tien } from '../../utils/format.js';
import { thongBaoLoi } from '../../utils/loi.js';

const tong = (ds, k) => ds.reduce((t, r) => t + r[k], 0);
const dauBang = ds => ds[0];

export const CAU_HINH = {
  'san-pham': {
    tieuDe: loc => `Top ${loc.top} sản phẩm bán chạy`, goi: loc => sanPhamBanChay({ tu_ngay: loc.tu_ngay, den_ngay: loc.den_ngay, top: loc.top }), khoa: 'ma_san_pham',
    ten: r => r.ten_san_pham, so: r => r.so_luong, nhan: r => `${soThuong(r.so_luong)} ly`,
    tip: r => ({ tieuDe: r.ten_san_pham, dong: [{ mau: MAU.chinh, nhan: 'Số ly', giaTri: soThuong(r.so_luong) }, { nhan: 'Doanh thu', giaTri: tien(r.doanh_thu) }] }),
    cot: [{ khoa: 'ten_san_pham', tieuDe: 'Sản phẩm', hienThi: r => <strong>{r.ten_san_pham}</strong> }, { khoa: 'so_luong', tieuDe: 'Số ly', canPhai: true, hienThi: r => soThuong(r.so_luong) }, { khoa: 'doanh_thu', tieuDe: 'Doanh thu', canPhai: true, hienThi: r => tien(r.doanh_thu) }],
    chiSo: ds => [{ nhan: 'Số ly (trong danh sách)', giaTri: soThuong(tong(ds, 'so_luong')) }, { nhan: 'Doanh thu (trong danh sách)', giaTri: tien(tong(ds, 'doanh_thu')) }, { nhan: 'Bán chạy nhất', giaTri: dauBang(ds)?.ten_san_pham ?? '—', phu: dauBang(ds) ? `${soThuong(dauBang(ds).so_luong)} ly` : undefined }],
    chuThich: 'Xếp theo số ly bán ra; doanh thu của sản phẩm đã trừ phần khuyến mãi. Chỉ tính các sản phẩm trong danh sách.',
    rong: 'Chưa có sản phẩm nào được bán trong khoảng này.',
  },
  'danh-muc': {
    tieuDe: () => 'Doanh thu theo danh mục', goi: loc => theoDanhMuc({ tu_ngay: loc.tu_ngay, den_ngay: loc.den_ngay }), khoa: 'ma_danh_muc',
    ten: r => r.ten_danh_muc, so: r => r.doanh_thu, nhan: r => `${tien(r.doanh_thu)} · ${phanTram(r.ty_le)}`,
    tip: r => ({ tieuDe: r.ten_danh_muc, dong: [{ mau: MAU.chinh, nhan: 'Doanh thu', giaTri: tien(r.doanh_thu) }, { nhan: 'Tỷ lệ', giaTri: phanTram(r.ty_le) }] }),
    cot: [{ khoa: 'ten_danh_muc', tieuDe: 'Danh mục', hienThi: r => <strong>{r.ten_danh_muc}</strong> }, { khoa: 'doanh_thu', tieuDe: 'Doanh thu', canPhai: true, hienThi: r => tien(r.doanh_thu) }, { khoa: 'ty_le', tieuDe: 'Tỷ lệ', canPhai: true, hienThi: r => phanTram(r.ty_le) }],
    chiSo: ds => [{ nhan: 'Tổng doanh thu', giaTri: tien(tong(ds, 'doanh_thu')) }, { nhan: 'Số danh mục có bán', giaTri: soThuong(ds.length) }, { nhan: 'Dẫn đầu', giaTri: dauBang(ds)?.ten_danh_muc ?? '—', phu: dauBang(ds) ? phanTram(dauBang(ds).ty_le) : undefined }],
    chuThich: 'Doanh thu tính từ từng dòng món (số lượng × đơn giá − giảm giá), nên tổng khớp với báo cáo doanh thu.',
    rong: 'Chưa có doanh thu theo danh mục trong khoảng này.',
  },
  'thanh-toan': {
    tieuDe: () => 'Doanh thu theo phương thức thanh toán', goi: loc => theoPhuongThuc({ tu_ngay: loc.tu_ngay, den_ngay: loc.den_ngay }), khoa: 'phuong_thuc',
    ten: r => PHUONG_THUC[r.phuong_thuc] ?? r.phuong_thuc, so: r => r.tong_tien, nhan: (r, ds) => `${tien(r.tong_tien)} · ${phanTram(tong(ds, 'tong_tien') ? (r.tong_tien / tong(ds, 'tong_tien')) * 100 : 0)}`,
    tip: (r, ds) => ({ tieuDe: PHUONG_THUC[r.phuong_thuc] ?? r.phuong_thuc, dong: [{ mau: MAU.chinh, nhan: 'Tổng tiền', giaTri: tien(r.tong_tien) }, { nhan: 'Số đơn', giaTri: soThuong(r.so_don) }, { nhan: 'Tỷ lệ', giaTri: phanTram(tong(ds, 'tong_tien') ? (r.tong_tien / tong(ds, 'tong_tien')) * 100 : 0) }] }),
    cot: [{ khoa: 'phuong_thuc', tieuDe: 'Phương thức', hienThi: r => <strong>{PHUONG_THUC[r.phuong_thuc] ?? r.phuong_thuc}</strong> }, { khoa: 'so_don', tieuDe: 'Số đơn', canPhai: true }, { khoa: 'tong_tien', tieuDe: 'Tổng tiền', canPhai: true, hienThi: r => tien(r.tong_tien) }],
    chiSo: ds => [{ nhan: 'Tổng tiền', giaTri: tien(tong(ds, 'tong_tien')) }, { nhan: 'Số đơn', giaTri: soThuong(tong(ds, 'so_don')) }, { nhan: 'Dùng nhiều nhất', giaTri: dauBang(ds) ? (PHUONG_THUC[dauBang(ds).phuong_thuc] ?? dauBang(ds).phuong_thuc) : '—', phu: dauBang(ds) ? `${soThuong(dauBang(ds).so_don)} đơn` : undefined }],
    chuThich: 'Xếp theo tổng tiền. Hóa đơn cũ chưa ghi phương thức được tính là tiền mặt.',
    rong: 'Chưa có hóa đơn đã thanh toán trong khoảng này.',
  },
  'nhan-vien': {
    tieuDe: () => 'Doanh thu theo nhân viên', goi: loc => theoNhanVien({ tu_ngay: loc.tu_ngay, den_ngay: loc.den_ngay }), khoa: 'ma_nhan_vien',
    ten: r => r.ho_ten, so: r => r.doanh_thu, nhan: r => `${tien(r.doanh_thu)} · ${soThuong(r.so_don)} đơn`,
    tip: r => ({ tieuDe: r.ho_ten, dong: [{ mau: MAU.chinh, nhan: 'Doanh thu', giaTri: tien(r.doanh_thu) }, { nhan: 'Số đơn', giaTri: soThuong(r.so_don) }, { nhan: 'Trung bình mỗi đơn', giaTri: r.so_don ? tien(r.doanh_thu / r.so_don) : '—' }] }),
    cot: [{ khoa: 'ho_ten', tieuDe: 'Nhân viên', hienThi: r => <strong>{r.ho_ten}</strong> }, { khoa: 'so_don', tieuDe: 'Số đơn', canPhai: true }, { khoa: 'doanh_thu', tieuDe: 'Doanh thu', canPhai: true, hienThi: r => tien(r.doanh_thu) }, { khoa: 'tb', tieuDe: 'Trung bình mỗi đơn', canPhai: true, hienThi: r => (r.so_don ? tien(r.doanh_thu / r.so_don) : '—') }],
    chiSo: ds => [{ nhan: 'Doanh thu', giaTri: tien(tong(ds, 'doanh_thu')) }, { nhan: 'Số đơn', giaTri: soThuong(tong(ds, 'so_don')) }, { nhan: 'Dẫn đầu', giaTri: dauBang(ds)?.ho_ten ?? '—', phu: dauBang(ds) ? tien(dauBang(ds).doanh_thu) : undefined }],
    chuThich: 'Doanh thu tính cho nhân viên nhập order của hóa đơn.',
    rong: 'Chưa có hóa đơn đã thanh toán trong khoảng này.',
  },
};

export default function XepHang({ loc, cauHinh: c }) {
  const bc = useApi(() => c.goi(loc), [loc.tu_ngay, loc.den_ngay, loc.top, c]);
  const ds = bc.data ?? [];
  const dong = ds.map(r => ({ khoa: r[c.khoa], ten: c.ten(r), so: c.so(r), nhan: c.nhan(r, ds), tip: c.tip(r, ds) }));
  const tieuDe = c.tieuDe(loc);
  const bang = ds.map(r => ({ ...r, __k: r[c.khoa] }));

  return (
    <>
      {bc.error && <div className="banner banner-loi" role="alert"><span>{thongBaoLoi(bc.error)}</span><button type="button" className="link-nut" onClick={bc.reload}>Thử lại</button></div>}
      <div className={bc.loading && bc.data ? 'dang-tai' : undefined} aria-busy={bc.loading} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <ChiSo muc={c.chiSo(ds)} />
        {bc.data && !ds.length ? <div className="the bang-rong">{c.rong} Thử mở rộng khoảng ngày.</div> : (
          <TheBieuDo tieuDe={tieuDe} chuThich={c.chuThich} bang={<BangSo ten={tieuDe} cot={c.cot} dong={bang} khoaDong="__k" />}>
            <ThanhNgang dong={dong} tenDanhSach={tieuDe} />
          </TheBieuDo>
        )}
      </div>
    </>
  );
}
