// BC-05 chi phí nhập hàng so với doanh thu theo kỳ: hai chuỗi trên CÙNG một trục (không dùng hai trục), cột ghép đôi + bảng có chênh lệch.
// Kỳ chỉ có nhập hàng hoặc chỉ có bán hàng vẫn xuất hiện; chênh lệch có thể âm.
import { useApi } from '../../hooks/useApi.js';
import { chiPhiVsDoanhThu } from '../../api/bao-cao.api.js';
import { BangSo, ChiSo, CotChart, MAU, TheBieuDo } from '../../components/BieuDo.jsx';
import { dauTien, dayDuKy, kyHienTai, nhanKy, nhanKyDai, tien } from '../../utils/format.js';
import { thongBaoLoi } from '../../utils/loi.js';

const TEN_NHOM = { ngay: 'ngày', tuan: 'tuần', thang: 'tháng' };
const CHUOI = [{ ten: 'Doanh thu', mau: MAU.doanhThu }, { ten: 'Chi phí nhập hàng', mau: MAU.chiPhi }];

export default function ChiPhiDoanhThu({ loc }) {
  const { nhom } = loc;
  const bc = useApi(() => chiPhiVsDoanhThu({ tu_ngay: loc.tu_ngay, den_ngay: loc.den_ngay, nhom }), [loc.tu_ngay, loc.den_ngay, nhom]);
  const goc = bc.data ?? [];
  const theoKy = new Map(goc.map(r => [r.ky, r]));
  const dsKy = dayDuKy(nhom, loc.tu_ngay, loc.den_ngay);
  const dong = (dsKy ?? goc.map(r => r.ky)).map(ky => theoKy.get(ky) ?? { ky, doanh_thu: 0, chi_phi_nhap: 0, chenh_lech: 0 });

  const dt = goc.reduce((t, r) => t + r.doanh_thu, 0);
  const cp = goc.reduce((t, r) => t + r.chi_phi_nhap, 0);
  const cl = Math.round((dt - cp) * 100) / 100;
  const hienKy = kyHienTai(nhom);

  const ky = dong.map(r => ({
    khoa: r.ky, nhan: nhanKy(r.ky, nhom), gia: [r.doanh_thu, r.chi_phi_nhap], mo: r.ky === hienKy,
    tip: { tieuDe: nhanKyDai(r.ky, nhom) + (r.ky === hienKy ? ' (chưa hết)' : ''), dong: [
      { mau: MAU.doanhThu, nhan: 'Doanh thu', giaTri: tien(r.doanh_thu) }, { mau: MAU.chiPhi, nhan: 'Chi phí nhập', giaTri: tien(r.chi_phi_nhap) }, { nhan: 'Chênh lệch', giaTri: dauTien(r.chenh_lech) }] },
  }));
  const cot = [
    { khoa: 'ky', tieuDe: nhom === 'thang' ? 'Tháng' : nhom === 'tuan' ? 'Tuần' : 'Ngày', hienThi: r => nhanKyDai(r.ky, nhom) },
    { khoa: 'doanh_thu', tieuDe: 'Doanh thu', canPhai: true, hienThi: r => tien(r.doanh_thu) },
    { khoa: 'chi_phi_nhap', tieuDe: 'Chi phí nhập', canPhai: true, hienThi: r => tien(r.chi_phi_nhap) },
    { khoa: 'chenh_lech', tieuDe: 'Chênh lệch', canPhai: true, hienThi: r => <strong>{dauTien(r.chenh_lech)}</strong> },
  ];

  return (
    <>
      {bc.error && <div className="banner banner-loi" role="alert"><span>{thongBaoLoi(bc.error)}</span><button type="button" className="link-nut" onClick={bc.reload}>Thử lại</button></div>}
      <div className={bc.loading && bc.data ? 'dang-tai' : undefined} aria-busy={bc.loading} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <ChiSo muc={[
          { nhan: 'Doanh thu', giaTri: tien(dt) },
          { nhan: 'Chi phí nhập hàng', giaTri: tien(cp) },
          { nhan: 'Chênh lệch', giaTri: dauTien(cl), phu: cl < 0 ? 'Chi nhiều hơn thu' : cl > 0 ? 'Thu nhiều hơn chi' : 'Thu bằng chi' },
        ]} />
        {bc.data && !goc.length ? (
          <div className="the bang-rong">Chưa có hóa đơn đã thanh toán hay phiếu nhập trong khoảng này.</div>
        ) : (
          <TheBieuDo tieuDe={`Doanh thu và chi phí nhập hàng theo ${TEN_NHOM[nhom]}`} chuGiai={CHUOI}
                     chuThich="Chi phí nhập là tiền nhập nguyên liệu theo ngày nhập, chưa gồm lương hay chi phí khác; doanh thu chưa trừ giá vốn. Chênh lệch = doanh thu − chi phí nhập, xem ở bảng hoặc khi rê chuột."
                     bang={<BangSo ten="Chi phí nhập và doanh thu theo kỳ" cot={cot} dong={dong} khoaDong="ky" />}>
            <CotChart ky={ky} chuoi={CHUOI} moTa={`Biểu đồ cột ghép đôi doanh thu và chi phí nhập hàng theo ${TEN_NHOM[nhom]}, ${dong.length} kỳ. Tổng doanh thu ${tien(dt)}, tổng chi phí nhập ${tien(cp)}.`} />
          </TheBieuDo>
        )}
      </div>
    </>
  );
}
