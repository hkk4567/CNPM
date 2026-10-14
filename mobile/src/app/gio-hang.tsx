// Giỏ gọi món: chỉnh số lượng, ghi chú, rồi gửi order mới (POS-02) hoặc thêm món vào order đang mở (POS-03).
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGioHang } from '../context/GioHang';
import { themDong, taoOrder, type CanhBaoKho } from '../api/hoa-don';
import { thongBaoLoi } from '../api/http';
import { Banner, BoDem, Chu, Nut, The, TruongNhap } from '../components/ui';
import { HopXacNhan } from '../components/HopXacNhan';
import { tien } from '../utils/tien';
import { mau } from '../theme';

export default function GioHang() {
  const router = useRouter();
  const kv = useSafeAreaInsets();
  const gio = useGioHang();
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState('');
  const [hoiXoa, setHoiXoa] = useState(false);

  const gui = async () => {
    setLoi(''); setDang(true);
    const canhBao = new Map<number, CanhBaoKho>();
    const gom = (c?: CanhBaoKho[]) => (c ?? []).forEach((x) => canhBao.set(x.ma_nguyen_lieu, x));
    try {
      let ma: number;
      if (gio.dich) {
        ma = gio.dich.ma_hoa_don;
        const daGui: number[] = [];
        try {
          for (const d of gio.dong) {
            gom((await themDong(ma, { ma_san_pham: d.ma_san_pham, so_luong: d.so_luong, ghi_chu: d.ghi_chu || null })).canh_bao_kho);
            daGui.push(d.ma_san_pham);
          }
        } finally { gio.boDaGui(daGui); } // món đã vào order thì bỏ khỏi giỏ, để gửi lại không bị trùng
      } else {
        const o = await taoOrder(gio.dong.map((d) => ({ ma_san_pham: d.ma_san_pham, so_luong: d.so_luong, ghi_chu: d.ghi_chu || null })));
        ma = o.ma_hoa_don; gom(o.canh_bao_kho); gio.xoaHet();
      }
      gio.datCanhBaoKho([...canhBao.values()]);
      gio.datDich(null);
      router.replace(`/order/${ma}`);
    } catch (e) { setLoi(thongBaoLoi(e)); setDang(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.dau, { paddingTop: kv.top + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()} style={s.quay}><Ionicons name="chevron-back" size={24} color={mau.teal} /></Pressable>
        <Chu kieu="tieuMuc" style={{ flex: 1 }}>{gio.dich ? `Thêm vào Order #${gio.dich.so_thu_tu}` : 'Giỏ gọi món'}</Chu>
        {gio.dong.length > 0 && <Pressable accessibilityRole="button" onPress={() => setHoiXoa(true)} style={s.quay}><Chu kieu="nhan" style={{ color: mau.loi }}>Xóa hết</Chu></Pressable>}
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 24 }}>
        {loi ? <Banner>{loi}</Banner> : null}
        {gio.dong.length === 0 ? (
          <View style={{ alignItems: 'center', gap: 12, marginTop: 40 }}>
            <Chu style={{ color: mau.muted }}>Giỏ đang trống</Chu>
            <Nut nhan="Chọn món" kieu="vien" onPress={() => router.back()} />
          </View>
        ) : gio.dong.map((d) => (
          <The key={d.ma_san_pham} style={{ gap: 8 }}>
            <View style={s.hang}>
              <View style={{ flex: 1 }}>
                <Chu kieu="nhan">{d.ten_san_pham}</Chu>
                <Chu kieu="nho">{tien(d.gia_sau_giam)} × {d.so_luong} = {tien(d.gia_sau_giam * d.so_luong)}</Chu>
              </View>
              <BoDem thungRac ten={d.ten_san_pham} gia_tri={d.so_luong} min={0} max={d.toi_da} onDoi={(v) => (v === 0 ? gio.bo(d.ma_san_pham) : v > d.so_luong ? gio.tang(d.ma_san_pham) : gio.giam(d.ma_san_pham))} />
            </View>
            <TruongNhap nhan="Ghi chú" value={d.ghi_chu} onChangeText={(t) => gio.datGhiChu(d.ma_san_pham, t)} maxLength={255} autoCapitalize="sentences" placeholder="Ít đá, nhiều đường..." />
          </The>
        ))}
      </ScrollView>
      {gio.dong.length > 0 && (
        <View style={[s.chan, { paddingBottom: kv.bottom + 12 }]}>
          <View style={s.hang}><Chu kieu="nhan" style={{ flex: 1 }}>{gio.tongLy} ly · tạm tính</Chu><Chu kieu="tieuMuc">{tien(gio.tamTinh)}</Chu></View>
          <Chu kieu="nho">Khuyến mãi và kho do máy chủ tính khi gửi; số tiền cuối cùng xem ở order.</Chu>
          <Nut nhan={gio.dich ? 'Thêm vào order' : 'Gửi order'} onPress={gui} dangXuLy={dang} />
        </View>
      )}
      <HopXacNhan hien={hoiXoa} tieuDe="Xóa hết giỏ?" noiDung="Các món đã chọn sẽ bị bỏ." nhanXacNhan="Xóa hết" nguyHiem onHuy={() => setHoiXoa(false)} onXacNhan={() => { setHoiXoa(false); gio.xoaHet(); }} />
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  dau: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingBottom: 6, backgroundColor: mau.be, borderBottomWidth: 1, borderBottomColor: mau.line },
  quay: { minWidth: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  hang: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chan: { backgroundColor: mau.be, borderTopWidth: 1, borderTopColor: mau.line, padding: 14, gap: 8 },
});
