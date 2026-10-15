// Hóa đơn đã thanh toán (POS-11), dạng biên lai: đầu trang xác nhận + tổng tiền lớn, thân là tờ biên lai trắng có đường đứt nét và hai khuyết bên hông.
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TEN_PHUONG_THUC, type KetQuaThanhToan, type Order, type PhuongThuc } from '../api/hoa-don';
import { ngayGio, tien } from '../utils/tien';
import { bo, font, mau } from '../theme';
import { Chu, Nut } from './ui';

const KHUYET = 20;

function DuongDut({ khuyet }: { khuyet?: boolean }) {
  return (
    <View style={{ marginVertical: 14, justifyContent: 'center' }}>
      <View style={{ height: 1, overflow: 'hidden' }}>
        <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: mau.lineInput, borderRadius: 1, marginTop: -1 }} />
      </View>
      {khuyet && (<><View style={[s.khuyet, { left: -KHUYET / 2 - 14 }]} /><View style={[s.khuyet, { right: -KHUYET / 2 - 14 }]} /></>)}
    </View>
  );
}
const Dong = ({ nhan, giaTri, dam, mauChu }: { nhan: string; giaTri: string; dam?: boolean; mauChu?: string }) => (
  <View style={s.dong}>
    <Chu kieu={dam ? 'tieuMuc' : 'than'} style={{ flex: 1, color: dam ? mau.ink : mau.muted }}>{nhan}</Chu>
    <Chu kieu={dam ? 'tieuMuc' : 'than'} style={mauChu ? { color: mauChu } : undefined}>{giaTri}</Chu>
  </View>
);

export function HoaDonDaThanhToan({ o, vuaTT, onOrderMoi, onVeDanhSach }: { o: Order; vuaTT: KetQuaThanhToan | null; onOrderMoi: () => void; onVeDanhSach: () => void }) {
  const tong = o.tong_tien ?? o.tong_tien_tam_tinh;
  const pt = o.phuong_thuc_thanh_toan ? (TEN_PHUONG_THUC[o.phuong_thuc_thanh_toan as PhuongThuc] ?? o.phuong_thuc_thanh_toan) : '';
  return (
    <View style={{ gap: 16 }}>
      <View style={s.dau}>
        <View style={s.dau_tron}><Ionicons name="checkmark" size={34} color="#fff" /></View>
        <Chu kieu="nhan" style={{ color: mau.okChu }}>Đã thanh toán</Chu>
        <Chu style={s.tong} accessibilityLabel={`Tổng ${tien(tong)}`}>{tien(tong)}</Chu>
        <Chu kieu="nho">{ngayGio(o.thoi_gian_tao)}</Chu>
        {vuaTT && vuaTT.diem_hien_tai !== null ? (
          <View style={s.diem}><Ionicons name="star" size={14} color={mau.okChu} /><Chu kieu="nhan" style={{ color: mau.okChu }}>Cộng {vuaTT.diem_cong} điểm, khách có {vuaTT.diem_hien_tai} điểm</Chu></View>
        ) : vuaTT ? <Chu kieu="nho">Khách lẻ, không tích điểm</Chu> : null}
      </View>

      <View style={s.giay}>
        {o.chi_tiet.map((d) => (
          <View key={d.ma_chi_tiet} style={{ marginBottom: 10 }}>
            <View style={s.dong}>
              <Chu kieu="nhan" style={{ flex: 1 }}>{d.so_luong} × {d.ten_san_pham}</Chu>
              <Chu kieu="nhan">{tien(d.thanh_tien)}</Chu>
            </View>
            {d.ghi_chu ? <Chu kieu="nho">Ghi chú: {d.ghi_chu}</Chu> : null}
            {d.giam_gia > 0 && <Chu kieu="nho" style={{ color: mau.okChu }}>{d.khuyen_mai.map((k) => k.ten_khuyen_mai).join(', ') || 'Khuyến mãi'} −{tien(d.giam_gia)}</Chu>}
          </View>
        ))}
        <DuongDut khuyet />
        <Dong nhan="Tiền hàng" giaTri={tien(o.tong_tien_hang)} />
        {o.tong_giam_gia > 0 && <Dong nhan="Giảm giá" giaTri={`−${tien(o.tong_giam_gia)}`} mauChu={mau.okChu} />}
        <View style={{ height: 6 }} />
        <Dong nhan="Tổng tiền" giaTri={tien(tong)} dam />
        <DuongDut khuyet />
        <Dong nhan="Thanh toán" giaTri={pt} />
        <Dong nhan="Nhân viên" giaTri={o.ten_nhan_vien} />
        <Dong nhan="Khách" giaTri={o.ten_khach_hang ?? 'Khách lẻ'} />
      </View>

      <View style={{ gap: 10 }}>
        <Nut nhan="Order mới" onPress={onOrderMoi} />
        <Nut nhan="Về danh sách order" kieu="vien" onPress={onVeDanhSach} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  dau: { alignItems: 'center', gap: 4, paddingTop: 8 },
  dau_tron: { width: 64, height: 64, borderRadius: 32, backgroundColor: mau.okChu, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  tong: { fontFamily: font.rat, fontSize: 38, lineHeight: 48, color: mau.ink },
  diem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: mau.okNen, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginTop: 8 },
  giay: { backgroundColor: mau.be, borderRadius: bo.lon, padding: 18, paddingBottom: 14 },
  dong: { flexDirection: 'row', alignItems: 'baseline', gap: 12, paddingVertical: 2 },
  khuyet: { position: 'absolute', width: KHUYET, height: KHUYET, borderRadius: KHUYET / 2, backgroundColor: mau.nen },
});
