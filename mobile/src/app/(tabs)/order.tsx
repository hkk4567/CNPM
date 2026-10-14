// POS-10: order hôm nay (nhân viên chỉ xem được hôm nay). Chạm vào order để xem/sửa.
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTai } from '../../hooks/useTai';
import { danhSachOrder, TEN_TRANG_THAI, type OrderTom, type TrangThai } from '../../api/hoa-don';
import { Banner, Chip, Chu } from '../../components/ui';
import { gioTuIso, tien } from '../../utils/tien';
import { bo, mau } from '../../theme';

const LOC: { ma: TrangThai | null; ten: string }[] = [
  { ma: null, ten: 'Tất cả' }, { ma: 'dang_pha_che', ten: TEN_TRANG_THAI.dang_pha_che }, { ma: 'da_phuc_vu', ten: TEN_TRANG_THAI.da_phuc_vu },
  { ma: 'da_thanh_toan', ten: TEN_TRANG_THAI.da_thanh_toan }, { ma: 'huy', ten: TEN_TRANG_THAI.huy },
];
export const loaiChip = (t: TrangThai) => ({ dang_pha_che: 'canhBao', da_phuc_vu: 'teal', da_thanh_toan: 'ok', huy: 'xam' } as const)[t];

export default function DanhSachOrder() {
  const router = useRouter();
  const kv = useSafeAreaInsets();
  const [loc, setLoc] = useState<TrangThai | null>(null);
  const { duLieu, dangTai, dangLamMoi, loi, taiLai, lamMoi, taiNgam } = useTai(() => danhSachOrder(loc ?? undefined), `loc|${loc}`);
  useFocusEffect(useCallback(() => { taiNgam(); }, [])); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ flex: 1 }}>
      <View style={[s.dau, { paddingTop: kv.top + 12 }]}>
        <Chu kieu="tieuDe">Order hôm nay</Chu>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
          {LOC.map((d) => (
            <Pressable key={String(d.ma)} accessibilityRole="button" accessibilityState={{ selected: loc === d.ma }} onPress={() => setLoc(d.ma)}
              style={[s.loc, loc === d.ma && { backgroundColor: mau.teal, borderColor: mau.teal }]}>
              <Chu kieu="nhan" style={{ color: loc === d.ma ? '#fff' : mau.ink }}>{d.ten}</Chu>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      {loi ? <View style={{ padding: 16 }}><Banner taiLai={taiLai}>{loi}</Banner></View> : null}
      {dangTai && !duLieu ? <ActivityIndicator color={mau.teal} style={{ marginTop: 40 }} /> : null}
      {duLieu && !loi && (
        <FlatList<OrderTom> data={duLieu.data} keyExtractor={(o) => String(o.ma_hoa_don)} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={dangLamMoi} onRefresh={lamMoi} colors={[mau.teal]} />}
          ListEmptyComponent={<Chu style={{ color: mau.muted, textAlign: 'center', marginTop: 30 }}>Chưa có order nào</Chu>}
          renderItem={({ item: o }) => (
            <Pressable accessibilityRole="button" accessibilityLabel={`Order ${o.so_thu_tu}`} onPress={() => router.push(`/order/${o.ma_hoa_don}`)} style={s.the}>
              <View style={s.hang}>
                <Chu kieu="tieuMuc">#{o.so_thu_tu}</Chu>
                <Chip nhan={TEN_TRANG_THAI[o.trang_thai]} loai={loaiChip(o.trang_thai)} />
                <Chu kieu="nho" style={{ marginLeft: 'auto' }}>{gioTuIso(o.thoi_gian_tao)}</Chu>
              </View>
              <View style={s.hang}>
                <Chu kieu="nho" style={{ flex: 1 }}>{o.so_mon} ly · {o.ten_nhan_vien}{o.ten_khach_hang ? ` · ${o.ten_khach_hang}` : ''}</Chu>
                <Chu kieu="nhan">{tien(o.tong_tien)}</Chu>
              </View>
            </Pressable>
          )} />
      )}
    </View>
  );
}
const s = StyleSheet.create({
  dau: { backgroundColor: mau.be, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: mau.line, gap: 10 },
  loc: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: mau.lineInput, justifyContent: 'center', backgroundColor: mau.be },
  the: { backgroundColor: mau.be, borderRadius: bo.lon, borderWidth: 1, borderColor: mau.line, padding: 14, gap: 6, minHeight: 64 },
  hang: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
