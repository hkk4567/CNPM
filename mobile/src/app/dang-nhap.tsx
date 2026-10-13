import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePhien } from '../context/Phien';
import { datUrl, layUrl } from '../api/cau-hinh';
import { thongBaoLoi } from '../api/http';
import { Banner, Chu, Nut, TruongNhap } from '../components/ui';
import { mau } from '../theme';

export default function DangNhap() {
  const { dangNhap } = usePhien();
  const kv = useSafeAreaInsets();
  const [ten, setTen] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [loi, setLoi] = useState('');
  const [dang, setDang] = useState(false);
  const [moMayChu, setMoMayChu] = useState(false);
  const [mayChu, setMayChu] = useState(layUrl());

  const gui = async () => {
    if (!ten.trim() || !matKhau) { setLoi('Nhập tên đăng nhập và mật khẩu'); return; }
    setLoi(''); setDang(true);
    try {
      if (moMayChu) await datUrl(mayChu);
      await dangNhap(ten, matKhau);
    } catch (e) { setLoi(thongBaoLoi(e)); setDang(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.nd, { paddingTop: kv.top + 48, paddingBottom: kv.bottom + 24 }]}>
        <View style={s.logo}><Ionicons name="cafe" size={34} color="#fff" /></View>
        <Chu kieu="tieuDe" style={{ textAlign: 'center' }}>Quán cà phê</Chu>
        <Chu kieu="nho" style={{ textAlign: 'center', marginBottom: 8 }}>Đăng nhập dành cho nhân viên</Chu>
        {loi ? <Banner>{loi}</Banner> : null}
        <TruongNhap nhan="Tên đăng nhập" value={ten} onChangeText={setTen} textContentType="username" returnKeyType="next" />
        <TruongNhap nhan="Mật khẩu" matKhau value={matKhau} onChangeText={setMatKhau} textContentType="password" returnKeyType="go" onSubmitEditing={gui} />
        <Nut nhan="Đăng nhập" onPress={gui} dangXuLy={dang} />
        <Pressable accessibilityRole="button" onPress={() => setMoMayChu(!moMayChu)} style={s.mayChuNut}>
          <Ionicons name="server-outline" size={18} color={mau.muted} />
          <Chu kieu="nho">Máy chủ</Chu>
          <Ionicons name={moMayChu ? 'chevron-up' : 'chevron-down'} size={16} color={mau.muted} />
        </Pressable>
        {moMayChu && (
          <View style={{ gap: 6 }}>
            <TruongNhap nhan="Địa chỉ máy chủ" value={mayChu} onChangeText={setMayChu} keyboardType="url" placeholder="192.168.1.10:3000" />
            <Chu kieu="nho">Điện thoại thật: nhập IP máy tính chạy backend (cùng Wi-Fi), ví dụ 192.168.1.10:3000.</Chu>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
const s = StyleSheet.create({
  nd: { paddingHorizontal: 20, gap: 14 },
  logo: { alignSelf: 'center', width: 68, height: 68, borderRadius: 20, backgroundColor: mau.teal, alignItems: 'center', justifyContent: 'center' },
  mayChuNut: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', minHeight: 44 },
});
