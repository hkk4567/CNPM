// BC-01 doanh thu theo ngày/tuần/tháng: dải 3 số liệu, biểu đồ cột (+ bảng) và khung "Bán chạy nhất" (BC-02, top 5 cùng khoảng ngày).
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi.js';
import { doanhThu, sanPhamBanChay } from '../../api/bao-cao.api.js';
import { BangSo, ChiSo, CotChart, MAU, TheBieuDo } from '../../components/BieuDo.jsx';
import { dayDuKy, kyHienTai, nhanKy, nhanKyDai, soThuong, tien, tienGon } from '../../utils/format.js';
import { thongBaoLoi } from '../../utils/loi.js';

const TEN_NHOM = { ngay: 'ngày', tuan: 'tuần', thang: 'tháng' };

export default function DoanhThu({ loc }) {
  const { nhom } = loc;
  const bc = useApi(() => doanhThu({ tu_ngay: loc.tu_ngay, den_ngay: loc.den_ngay, nhom }), [loc.tu_ngay, loc.den_ngay, nhom]);
  const top = useApi(() => sanPhamBanChay({ tu_ngay: loc.tu_ngay, den_ngay: loc.den_ngay, top: 5 }), [loc.tu_ngay, loc.den_ngay]);

  const goc = bc.data ?? [];
  const theoKy = new Map(goc.map(r => [r.ky, r]));
  const dsKy = dayDuKy(nhom, loc.tu_ngay, loc.den_ngay);
  const dong = (dsKy ?? goc.map(r => r.ky)).map(ky => theoKy.get(ky) ?? { ky, so_don: 0, doanh_thu: 0 });

  const tongTien = goc.reduce((t, r) => t + r.doanh_thu, 0);
  const tongDon = goc.reduce((t, r) => t + r.so_don, 0);
  const hienKy = kyHienTai(nhom);
  const coHienTai = dong.some(r => r.ky === hienKy);
  const dinh = dong.reduce((b, r) => (r.doanh_thu > (b?.doanh_thu ?? 0) ? r : b), null);

  const ky = dong.map(r => ({
    khoa: r.ky, nhan: nhanKy(r.ky, nhom), gia: [r.doanh_thu], mo: r.ky === hienKy,
    tip: { tieuDe: nhanKyDai(r.ky, nhom) + (r.ky === hienKy ? ' (chưa hết)' : ''), dong: [{ mau: MAU.chinh, nhan: 'Doanh thu', giaTri: tien(r.doanh_thu) }, { nhan: 'Số đơn', giaTri: soThuong(r.so_don) }] },
  }));
  const cot = [
    { khoa: 'ky', tieuDe: nhom === 'thang' ? 'Tháng' : nhom === 'tuan' ? 'Tuần' : 'Ngày', hienThi: r => nhanKyDai(r.ky, nhom) },
    { khoa: 'so_don', tieuDe: 'Số đơn', canPhai: true },
    { khoa: 'doanh_thu', tieuDe: 'Doanh thu', canPhai: true, hienThi: r => tien(r.doanh_thu) },
    { khoa: 'tb', tieuDe: 'Trung bình mỗi đơn', canPhai: true, hienThi: r => (r.so_don ? tien(r.doanh_thu / r.so_don) : '—') },
  ];
  const moTa = dinh ? `Biểu đồ cột doanh thu theo ${TEN_NHOM[nhom]}, ${dong.length} cột. Cao nhất ${nhanKyDai(dinh.ky, nhom)} là ${tien(dinh.doanh_thu)}.` : '';

  return (
    <>
      {bc.error && <div className="banner banner-loi" role="alert"><span>{thongBaoLoi(bc.error)}</span><button type="button" className="link-nut" onClick={bc.reload}>Thử lại</button></div>}
      <div className={bc.loading && bc.data ? 'dang-tai' : undefined} aria-busy={bc.loading} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <ChiSo muc={[
          { nhan: 'Doanh thu', giaTri: tien(tongTien) },
          { nhan: 'Số đơn', giaTri: soThuong(tongDon) },
          { nhan: 'Trung bình mỗi đơn', giaTri: tongDon ? tien(tongTien / tongDon) : '—' },
        ]} />

        {bc.data && !goc.length ? (
          <div className="the bang-rong">Chưa có hóa đơn đã thanh toán trong khoảng này. Thử mở rộng khoảng ngày.</div>
        ) : (
          <div className="hai-cot">
            <div className="chinh" style={{ flexBasis: 560 }}>
              <TheBieuDo tieuDe={`Doanh thu theo ${TEN_NHOM[nhom]}`}
                         chuThich={`Trục tính bằng nghìn (k), triệu (tr) đồng.${coHienTai ? ` Cột nhạt là ${nhom === 'ngay' ? 'hôm nay' : nhom === 'tuan' ? 'tuần này' : 'tháng này'}, chưa kết thúc.` : ''}${dsKy ? ' Kỳ không có hóa đơn tính là 0.' : ''}`}
                         bang={<BangSo ten="Doanh thu theo kỳ" cot={cot} dong={dong} khoaDong="ky" />}>
                <CotChart ky={ky} chuoi={[{ ten: 'Doanh thu', mau: MAU.chinh }]} moTa={moTa} />
              </TheBieuDo>
            </div>

            <section className="the bd-the bd-phu" aria-label="Sản phẩm bán chạy">
              <h2>Bán chạy nhất</h2>
              <table className="bang bang-nho" aria-label="Top 5 sản phẩm bán chạy">
                <thead><tr><th scope="col">Sản phẩm</th><th scope="col" className="phai">Số ly</th><th scope="col" className="phai">Doanh thu</th></tr></thead>
                <tbody>
                  {(top.data ?? []).map(s => <tr key={s.ma_san_pham}><td><strong>{s.ten_san_pham}</strong></td><td className="phai">{soThuong(s.so_luong)}</td><td className="phai">{tien(s.doanh_thu)}</td></tr>)}
                </tbody>
              </table>
              {top.error && <span className="loi-truong">{thongBaoLoi(top.error)}</span>}
              {top.data && !top.data.length && <p className="goi-y">Chưa có sản phẩm nào được bán trong khoảng này.</p>}
              <Link to="/bao-cao/san-pham" className="link-nut" style={{ textDecoration: 'none' }}>Xem tất cả sản phẩm</Link>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
