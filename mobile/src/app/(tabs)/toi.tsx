import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePhien } from '../../context/Phien';
import { TEN_QUYEN } from '../../api/auth';
import { layUrl } from '../../api/cau-hinh';
import { Chip, Chu, Nut, The } from '../../components/ui';
import { HopXacNhan } from '../../components/HopXacNhan';

export default function CaNhan() {
  const { nguoiDung, dangXuat } = usePhien();
  const router = useRouter();
  const kv = useSafeAreaInsets();
  const [hoi, setHoi] = useState(false);
  if (!nguoiDung) return null;
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingTop: kv.top + 16, gap: 12 }}>
      <Chu kieu="tieuDe">Cá nhân</Chu>
      <The style={{ gap: 6 }}>
        <Chu kieu="tieuMuc">{nguoiDung.ho_ten}</Chu>
        <Chip nhan={TEN_QUYEN[nguoiDung.quyen_truy_cap]} />
        <View style={{ marginTop: 6 }}>
          <Chu kieu="nho">Máy chủ</Chu>
          <Chu kieu="nhan">{layUrl()}</Chu>
        </View>
      </The>
      <Nut nhan="Đổi mật khẩu" kieu="vien" onPress={() => router.push('/doi-mat-khau')} />
      <Nut nhan="Đăng xuất" kieu="nguyHiem" onPress={() => setHoi(true)} />
      <HopXacNhan hien={hoi} tieuDe="Đăng xuất?" noiDung="Bạn sẽ cần đăng nhập lại để tiếp tục làm việc." nhanXacNhan="Đăng xuất" nguyHiem
        onHuy={() => setHoi(false)} onXacNhan={() => { setHoi(false); dangXuat(); }} />
    </ScrollView>
  );
}
