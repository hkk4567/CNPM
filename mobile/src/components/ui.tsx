// Bộ thành phần giao diện dùng chung (cùng bảng màu với web).
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bo, CAO_NUT, font, mau } from '../theme';

type KieuChu = 'tieuDe' | 'tieuMuc' | 'than' | 'nhan' | 'nho';
const kieuChu: Record<KieuChu, TextStyle> = {
  tieuDe: { fontFamily: font.rat, fontSize: 22, lineHeight: 30, color: mau.ink },
  tieuMuc: { fontFamily: font.dam, fontSize: 17, lineHeight: 24, color: mau.ink },
  than: { fontFamily: font.thuong, fontSize: 15, lineHeight: 22, color: mau.ink },
  nhan: { fontFamily: font.dam, fontSize: 14, lineHeight: 20, color: mau.ink },
  nho: { fontFamily: font.thuong, fontSize: 13, lineHeight: 18, color: mau.muted },
};
export function Chu({ kieu = 'than', style, ...p }: { kieu?: KieuChu } & React.ComponentProps<typeof Text>) {
  return <Text {...p} style={[kieuChu[kieu], style]} />;
}

export function Nut({ nhan, onPress, kieu = 'chinh', dangXuLy, voHieu, style }: {
  nhan: string; onPress: () => void; kieu?: 'chinh' | 'vien' | 'nguyHiem'; dangXuLy?: boolean; voHieu?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const t = { chinh: { nen: mau.teal, chu: '#fff', vien: mau.teal }, vien: { nen: mau.be, chu: mau.teal, vien: mau.teal }, nguyHiem: { nen: mau.loi, chu: '#fff', vien: mau.loi } }[kieu];
  const tat = voHieu || dangXuLy;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={nhan} disabled={tat} onPress={onPress}
      style={({ pressed }) => [s.nut, { backgroundColor: t.nen, borderColor: t.vien, opacity: tat ? 0.55 : pressed ? 0.85 : 1 }, style]}>
      {dangXuLy ? <ActivityIndicator color={t.chu} /> : <Text style={[s.nutChu, { color: t.chu }]}>{nhan}</Text>}
    </Pressable>
  );
}

export function Chip({ nhan, loai = 'teal' }: { nhan: string; loai?: 'teal' | 'ok' | 'xam' | 'canhBao' }) {
  const m = { teal: [mau.tealNhat, mau.tealDam], ok: [mau.okNen, mau.okChu], xam: [mau.lineSoft, mau.muted], canhBao: [mau.canhBaoNen, mau.canhBaoChu] }[loai];
  return <View style={[s.chip, { backgroundColor: m[0] }]}><Text style={[s.chipChu, { color: m[1] }]}>{nhan}</Text></View>;
}

export function Banner({ loai = 'loi', children, taiLai }: { loai?: 'loi' | 'canhBao'; children: ReactNode; taiLai?: () => void }) {
  const loi = loai === 'loi';
  return (
    <View accessibilityRole="alert" style={[s.banner, { backgroundColor: loi ? mau.loiNen : mau.canhBaoNen }]}>
      <Text style={[kieuChu.than, { color: loi ? mau.loiChu : mau.canhBaoChu }]}>{children}</Text>
      {taiLai && <Pressable accessibilityRole="button" onPress={taiLai} style={s.thuLai}><Text style={[kieuChu.nhan, { color: loi ? mau.loiChu : mau.canhBaoChu }]}>Thử lại</Text></Pressable>}
    </View>
  );
}

export function TruongNhap({ nhan, loi, matKhau, ...p }: { nhan: string; loi?: string; matKhau?: boolean } & TextInputProps) {
  const [hien, setHien] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={kieuChu.nhan}>{nhan}</Text>
      <View style={[s.o, loi ? { borderColor: mau.loi } : null]}>
        <TextInput {...p} accessibilityLabel={nhan} secureTextEntry={matKhau && !hien} placeholderTextColor={mau.muted} style={s.oChu} autoCapitalize="none" autoCorrect={false} />
        {matKhau && (
          <Pressable accessibilityRole="button" accessibilityLabel={hien ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onPress={() => setHien(!hien)} hitSlop={8} style={s.mat}>
            <Ionicons name={hien ? 'eye-off-outline' : 'eye-outline'} size={22} color={mau.muted} />
          </Pressable>
        )}
      </View>
      {loi ? <Text style={[kieuChu.nho, { color: mau.loi }]}>{loi}</Text> : null}
    </View>
  );
}

// Bộ đếm − n +: nút 44px; nhỏ nhất `min`, lớn nhất `max`.
export function BoDem({ gia_tri, min = 0, max = 99, onDoi, ten, thungRac }: { gia_tri: number; min?: number; max?: number; onDoi: (v: number) => void; ten: string; thungRac?: boolean }) {
  return (
    <View style={s.dem}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Giảm ${ten}`} disabled={gia_tri <= min} onPress={() => onDoi(gia_tri - 1)} style={[s.demNut, gia_tri <= min && { opacity: 0.35 }]}>
        <Ionicons name={thungRac && gia_tri === 1 ? 'trash-outline' : 'remove'} size={20} color={mau.teal} />
      </Pressable>
      <Text accessibilityLabel={`Số lượng ${ten}`} style={s.demSo}>{gia_tri}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Tăng ${ten}`} disabled={gia_tri >= max} onPress={() => onDoi(gia_tri + 1)} style={[s.demNut, gia_tri >= max && { opacity: 0.35 }]}>
        <Ionicons name="add" size={20} color={mau.teal} />
      </Pressable>
    </View>
  );
}

export function The({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.the, style]}>{children}</View>;
}

const s = StyleSheet.create({
  nut: { minHeight: CAO_NUT, borderRadius: bo.nho, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  nutChu: { fontFamily: font.dam, fontSize: 16 },
  chip: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  chipChu: { fontFamily: font.dam, fontSize: 12, lineHeight: 17 },
  banner: { borderRadius: bo.nho, padding: 12, gap: 6 },
  thuLai: { alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center' },
  o: { minHeight: CAO_NUT, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: mau.lineInput, borderRadius: bo.nho, backgroundColor: mau.be, paddingLeft: 12 },
  oChu: { flex: 1, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null), fontFamily: font.thuong, fontSize: 16, color: mau.ink, paddingVertical: 10 },
  mat: { width: 48, height: CAO_NUT, alignItems: 'center', justifyContent: 'center' },
  dem: { flexDirection: 'row', alignItems: 'center' },
  demNut: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: mau.teal, alignItems: 'center', justifyContent: 'center', backgroundColor: mau.be },
  demSo: { minWidth: 36, textAlign: 'center', fontFamily: font.dam, fontSize: 16, color: mau.ink },
  the: { backgroundColor: mau.be, borderRadius: bo.lon, borderWidth: 1, borderColor: mau.line, padding: 14 },
});
