// AUTH-02: đổi mật khẩu. Luật khớp backend: 8–72 ký tự, có chữ và số, khác mật khẩu cũ.
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { doiMatKhau } from '../api/auth';
import { ApiError, thongBaoLoi } from '../api/http';
import { Banner, Chu, Nut, TruongNhap } from '../components/ui';

type Loi = { cu?: string; moi?: string; lai?: string; chung?: string };

export default function DoiMatKhau() {
  const router = useRouter();
  const kv = useSafeAreaInsets();
  const [cu, setCu] = useState(''); const [moi, setMoi] = useState(''); const [lai, setLai] = useState('');
  const [loi, setLoi] = useState<Loi>({}); const [dang, setDang] = useState(false); const [xong, setXong] = useState(false);

  const gui = async () => {
    const l: Loi = {};
    if (!cu) l.cu = 'Nhập mật khẩu hiện tại';
    if (moi.length < 8 || moi.length > 72) l.moi = 'Mật khẩu mới dài 8–72 ký tự';
    else if (!/[A-Za-z]/.test(moi) || !/\d/.test(moi)) l.moi = 'Phải có ít nhất một chữ cái và một chữ số';
    else if (moi === cu) l.moi = 'Mật khẩu mới phải khác mật khẩu cũ';
    if (!l.moi && lai !== moi) l.lai = 'Nhập lại chưa khớp';
    setLoi(l);
    if (Object.keys(l).length) return;
    setDang(true);
    try { await doiMatKhau(cu, moi); setXong(true); }
    catch (e) {
      if (e instanceof ApiError && e.ma === 'SAI_MAT_KHAU_CU') setLoi({ cu: 'Mật khẩu hiện tại không đúng' });
      else if (e instanceof ApiError && e.ma === 'MAT_KHAU_MOI_TRUNG_CU') setLoi({ moi: 'Mật khẩu mới phải khác mật khẩu cũ' });
      else setLoi({ chung: thongBaoLoi(e) });
    } finally { setDang(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingTop: Platform.OS === 'ios' ? 24 : kv.top + 16, gap: 14 }}>
        <Chu kieu="tieuDe">Đổi mật khẩu</Chu>
        {xong ? (
          <>
            <Banner loai="canhBao">Đã đổi mật khẩu. Lần đăng nhập sau dùng mật khẩu mới.</Banner>
            <Nut nhan="Xong" onPress={() => router.back()} />
          </>
        ) : (
          <>
            {loi.chung ? <Banner>{loi.chung}</Banner> : null}
            <TruongNhap nhan="Mật khẩu hiện tại" matKhau value={cu} onChangeText={setCu} loi={loi.cu} />
            <TruongNhap nhan="Mật khẩu mới" matKhau value={moi} onChangeText={setMoi} loi={loi.moi} />
            <TruongNhap nhan="Nhập lại mật khẩu mới" matKhau value={lai} onChangeText={setLai} loi={loi.lai} />
            <Chu kieu="nho">8–72 ký tự, có ít nhất một chữ cái và một chữ số.</Chu>
            <Nut nhan="Lưu mật khẩu mới" onPress={gui} dangXuLy={dang} />
            <Nut nhan="Hủy" kieu="vien" onPress={() => router.back()} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
