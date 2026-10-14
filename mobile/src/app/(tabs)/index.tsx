// POS-01: menu gọi món. Chọn món vào giỏ; xem giỏ rồi gửi order (hoặc thêm vào order đang mở).
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTai } from '../../hooks/useTai';
import { layMenu, type MonMenu } from '../../api/menu';
import { useGioHang } from '../../context/GioHang';
import { Banner, BoDem, Chip, Chu, Nut } from '../../components/ui';
import { boDau, tien } from '../../utils/tien';
import { bo, font, mau } from '../../theme';

export default function GoiMon() {
  const router = useRouter();
  const kv = useSafeAreaInsets();
  const gio = useGioHang();
  const { duLieu, dangTai, dangLamMoi, loi, taiLai, lamMoi } = useTai(layMenu, 'menu');
  const [tuKhoa, setTuKhoa] = useState('');
  const [danhMuc, setDanhMuc] = useState<number | null>(null);

  const danhMucs = useMemo(() => {
    const m = new Map<number, string>();
    for (const x of duLieu ?? []) m.set(x.ma_danh_muc, x.ten_danh_muc);
    return [...m].map(([ma, ten]) => ({ ma, ten }));
  }, [duLieu]);
  const loc = useMemo(() => {
    const k = boDau(tuKhoa.trim());
    return (duLieu ?? []).filter((x) => (danhMuc === null || x.ma_danh_muc === danhMuc) && (!k || boDau(x.ten_san_pham).includes(k)));
  }, [duLieu, tuKhoa, danhMuc]);

  return (
    <View style={{ flex: 1 }}>
      <View style={[s.dau, { paddingTop: kv.top + 12 }]}>
        <Chu kieu="tieuDe">Gọi món</Chu>
        {gio.dich && (
          <View style={s.dich}>
            <Chu kieu="nhan" style={{ flex: 1, color: mau.tealDam }}>Đang thêm món vào Order #{gio.dich.so_thu_tu}</Chu>
            <Pressable accessibilityRole="button" onPress={() => { gio.datDich(null); gio.xoaHet(); }} style={s.huyDich}><Chu kieu="nhan" style={{ color: mau.teal }}>Hủy</Chu></Pressable>
          </View>
        )}
        <View style={s.timKiem}>
          <Ionicons name="search" size={18} color={mau.muted} />
          <TextInput accessibilityLabel="Tìm món" placeholder="Tìm món" placeholderTextColor={mau.muted} value={tuKhoa} onChangeText={setTuKhoa} style={s.oTim} />
          {tuKhoa ? <Pressable accessibilityRole="button" accessibilityLabel="Xóa tìm kiếm" onPress={() => setTuKhoa('')} style={s.xoaTim}><Ionicons name="close-circle" size={18} color={mau.muted} /></Pressable> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
          {[{ ma: null as number | null, ten: 'Tất cả' }, ...danhMucs].map((d) => (
            <Pressable key={String(d.ma)} accessibilityRole="button" accessibilityState={{ selected: danhMuc === d.ma }} onPress={() => setDanhMuc(d.ma)}
              style={[s.loc, danhMuc === d.ma && { backgroundColor: mau.teal, borderColor: mau.teal }]}>
              <Chu kieu="nhan" style={{ color: danhMuc === d.ma ? '#fff' : mau.ink }}>{d.ten}</Chu>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {loi ? <View style={{ padding: 16 }}><Banner taiLai={taiLai}>{loi}</Banner></View> : null}
      {dangTai && !duLieu ? <ActivityIndicator color={mau.teal} style={{ marginTop: 40 }} /> : null}
      {duLieu && (
        <FlatList data={loc} keyExtractor={(m) => String(m.ma_san_pham)} refreshControl={<RefreshControl refreshing={dangLamMoi} onRefresh={lamMoi} colors={[mau.teal]} />}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: gio.tongLy ? 96 : 24 }} keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Chu style={{ color: mau.muted, textAlign: 'center', marginTop: 30 }}>{duLieu.length ? 'Không có món khớp' : 'Menu đang trống'}</Chu>}
          renderItem={({ item }) => <HangMon mon={item} />} />
      )}

      {gio.tongLy > 0 && (
        <View style={s.thanhGio}>
          <Nut nhan={`Xem giỏ · ${gio.tongLy} ly · ${tien(gio.tamTinh)}`} onPress={() => router.push('/gio-hang')} />
        </View>
      )}
    </View>
  );
}

function HangMon({ mon }: { mon: MonMenu }) {
  const gio = useGioHang();
  const sl = gio.soLuongCua(mon.ma_san_pham);
  const het = mon.so_ly_toi_da === 0;
  const toiDa = Math.min(99, mon.so_ly_toi_da ?? 99);
  const giam = mon.gia_sau_giam < mon.gia_ban;
  return (
    <View style={[s.mon, het && { opacity: 0.6 }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Chu kieu="nhan">{mon.ten_san_pham}</Chu>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Chu kieu="than" style={{ fontFamily: font.dam, color: mau.tealDam }}>{tien(mon.gia_sau_giam)}</Chu>
          {giam && <Chu kieu="nho" style={{ textDecorationLine: 'line-through' }}>{tien(mon.gia_ban)}</Chu>}
        </View>
        {het ? <Chip nhan="Hết nguyên liệu" loai="xam" /> : mon.so_ly_toi_da !== null && mon.so_ly_toi_da <= 10 ? <Chip nhan={`Còn ${mon.so_ly_toi_da} ly`} loai="canhBao" /> : null}
      </View>
      {het ? null : sl === 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Thêm ${mon.ten_san_pham}`} onPress={() => gio.them(mon)} style={s.nutThem}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      ) : (
        <BoDem thungRac ten={mon.ten_san_pham} gia_tri={sl} min={0} max={toiDa} onDoi={(v) => (v > sl ? gio.them(mon) : gio.giam(mon.ma_san_pham))} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  dau: { backgroundColor: mau.be, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: mau.line, gap: 10 },
  dich: { flexDirection: 'row', alignItems: 'center', backgroundColor: mau.tealNhat, borderRadius: bo.nho, paddingLeft: 12 },
  huyDich: { minHeight: 44, minWidth: 56, alignItems: 'center', justifyContent: 'center' },
  timKiem: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: mau.lineInput, borderRadius: bo.nho, paddingLeft: 12, backgroundColor: mau.be },
  oTim: { flex: 1, minHeight: 44, fontFamily: font.thuong, fontSize: 16, color: mau.ink },
  xoaTim: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  loc: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: mau.lineInput, justifyContent: 'center', backgroundColor: mau.be },
  mon: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: mau.be, borderRadius: bo.lon, borderWidth: 1, borderColor: mau.line, padding: 12 },
  nutThem: { width: 44, height: 44, borderRadius: 22, backgroundColor: mau.teal, alignItems: 'center', justifyContent: 'center' },
  thanhGio: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: mau.be, borderTopWidth: 1, borderTopColor: mau.line },
});
