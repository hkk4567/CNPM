// NS-07: Lịch làm việc của tôi (theo tuần, T2..CN).
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePhien } from '../../context/Phien';
import { useTai } from '../../hooks/useTai';
import { lichTuan, type PhanCong } from '../../api/nhan-su';
import { Banner, Chip, Chu, The } from '../../components/ui';
import { congNgay, gioNgan, gioSangPhut, homNay, ngayNgan, phutTrongNgay, thuCuaNgay, thuHaiCua } from '../../utils/ngay';
import { mau } from '../../theme';

export default function LichCuaToi() {
  const { nguoiDung } = usePhien();
  const kv = useSafeAreaInsets();
  const hienTai = thuHaiCua(homNay());
  const [tuan, setTuan] = useState(hienTai);
  const { duLieu, dangTai, dangLamMoi, loi, taiLai, lamMoi } = useTai(() => lichTuan(tuan, nguoiDung!.ma_nhan_vien), `${tuan}|${nguoiDung?.ma_nhan_vien}`);

  const ngay = useMemo(() => Array.from({ length: 7 }, (_, i) => congNgay(tuan, i)), [tuan]);
  const theoNgay = useMemo(() => {
    const m: Record<string, PhanCong[]> = {};
    for (const p of duLieu?.data ?? []) (m[p.ngay_lam.slice(0, 10)] ??= []).push(p);
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.thoi_gian_bat_dau.localeCompare(b.thoi_gian_bat_dau));
    return m;
  }, [duLieu]);
  const hom = homNay();
  const tongCa = duLieu?.data.length ?? 0;
  const caKe = tuan === hienTai ? ngay.filter((n) => n >= hom).flatMap((n) => (theoNgay[n] ?? []).map((c) => ({ n, c })))
    .find(({ n, c }) => n > hom || gioSangPhut(c.thoi_gian_ket_thuc) > phutTrongNgay())
    : undefined;

  return (
    <View style={{ flex: 1 }}>
      <View style={[s.dau, { paddingTop: kv.top + 12 }]}>
        <Chu kieu="tieuDe">Lịch làm việc của tôi</Chu>
        <View style={s.chuyen}>
          <Pressable accessibilityRole="button" accessibilityLabel="Tuần trước" onPress={() => setTuan(congNgay(tuan, -7))} style={s.mui}><Ionicons name="chevron-back" size={22} color={mau.teal} /></Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Chu kieu="nhan">{ngayNgan(ngay[0])} – {ngayNgan(ngay[6])}</Chu>
            {tuan !== hienTai && <Pressable accessibilityRole="button" onPress={() => setTuan(hienTai)} style={{ minHeight: 28, justifyContent: 'center' }}><Chu kieu="nho" style={{ color: mau.teal }}>Tuần này</Chu></Pressable>}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Tuần sau" onPress={() => setTuan(congNgay(tuan, 7))} style={s.mui}><Ionicons name="chevron-forward" size={22} color={mau.teal} /></Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 24 }} refreshControl={<RefreshControl refreshing={dangLamMoi} onRefresh={lamMoi} colors={[mau.teal]} />}>
        {loi ? <Banner taiLai={taiLai}>{loi}</Banner> : null}
        {dangTai && !duLieu ? <ActivityIndicator color={mau.teal} style={{ marginTop: 40 }} /> : null}
        {duLieu && !loi && (
          <>
            <The style={{ backgroundColor: mau.tealHang }}>
              <Chu kieu="nhan">{tongCa === 0 ? 'Tuần này bạn chưa có ca nào' : `Tuần này bạn có ${tongCa} ca`}</Chu>
              {caKe && <Chu kieu="nho" style={{ marginTop: 2 }}>Ca kế tiếp: {caKe.n === hom ? 'hôm nay' : `${thuCuaNgay(caKe.n)} ${ngayNgan(caKe.n)}`}, {caKe.c.ten_ca} {gioNgan(caKe.c.thoi_gian_bat_dau)}–{gioNgan(caKe.c.thoi_gian_ket_thuc)}</Chu>}
            </The>
            {ngay.map((n) => {
              const ca = theoNgay[n] ?? [];
              const laHom = n === hom;
              return (
                <The key={n} style={laHom ? { borderColor: mau.teal, borderWidth: 2 } : undefined}>
                  <View style={s.hang}>
                    <View style={{ width: 52 }}>
                      <Chu kieu="tieuMuc">{thuCuaNgay(n)}</Chu>
                      <Chu kieu="nho">{ngayNgan(n)}</Chu>
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      {laHom && <Chip nhan="Hôm nay" />}
                      {ca.length === 0 ? <Chu kieu="than" style={{ color: mau.muted }}>Nghỉ</Chu> : ca.map((c) => {
                        const dang = laHom && phutTrongNgay() >= gioSangPhut(c.thoi_gian_bat_dau) && phutTrongNgay() < gioSangPhut(c.thoi_gian_ket_thuc);
                        return (
                          <View key={`${c.ma_ca}`} style={s.ca}>
                            <Chu kieu="nhan">{c.ten_ca} {gioNgan(c.thoi_gian_bat_dau)}–{gioNgan(c.thoi_gian_ket_thuc)}</Chu>
                            {dang && <Chip nhan="Đang diễn ra" loai="ok" />}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </The>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  dau: { backgroundColor: mau.be, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: mau.line, gap: 6 },
  chuyen: { flexDirection: 'row', alignItems: 'center' },
  mui: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  hang: { flexDirection: 'row', gap: 8 },
  ca: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, backgroundColor: mau.tealHang, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
});
