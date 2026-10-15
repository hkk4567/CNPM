// Gắn khách thành viên vào order (POS-06): nhập SĐT đủ 10 số để gắn ngay, hoặc gõ tên / một phần SĐT để tìm (KH-03);
// không có thì tạo nhanh khách mới (KH-01) rồi gắn luôn.
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ApiError, thongBaoLoi } from '../api/http';
import { SDT_HOP_LE, taoKhach, timKhach, type KhachHang } from '../api/khach-hang';
import { bo, mau } from '../theme';
import { Banner, Chu, Nut, TruongNhap } from './ui';

type Props = { hien: boolean; onGan: (sdt: string) => Promise<void>; onHuy: () => void };

export function HopKhach({ hien, onGan, onHuy }: Props) {
  const [kieu, setKieu] = useState<'tim' | 'tao'>('tim');
  const [q, setQ] = useState('');
  const [ten, setTen] = useState('');
  const [sdt, setSdt] = useState('');
  const [ds, setDs] = useState<KhachHang[] | null>(null);
  const [chuaDangKy, setChuaDangKy] = useState(false);
  const [loi, setLoi] = useState('');
  const [loiTen, setLoiTen] = useState('');
  const [loiSdt, setLoiSdt] = useState('');
  const [dang, setDang] = useState(false);

  const chay = async (viec: () => Promise<void>) => { setDang(true); setLoi(''); try { await viec(); } catch (e) { setLoi(thongBaoLoi(e)); } finally { setDang(false); } };

  const tim = () => chay(async () => {
    const x = q.trim();
    setDs(null); setChuaDangKy(false);
    if (!x) { setLoi('Nhập số điện thoại hoặc tên khách'); return; }
    if (SDT_HOP_LE.test(x)) {
      try { await onGan(x); }
      catch (e) { if (e instanceof ApiError && e.status === 404) setChuaDangKy(true); else throw e; }
      return;
    }
    setDs(await timKhach(x));
  });

  const moFormTao = () => {
    const soHet = /^\d+$/.test(q.trim());
    setTen(soHet ? '' : q.trim()); setSdt(soHet ? q.trim() : '');
    setLoi(''); setLoiTen(''); setLoiSdt(''); setKieu('tao');
  };

  const tao = () => chay(async () => {
    const t = ten.trim(); const s = sdt.trim();
    const lt = !t ? 'Nhập tên khách' : t.length > 100 ? 'Tên tối đa 100 ký tự' : '';
    const ls = SDT_HOP_LE.test(s) ? '' : 'Số điện thoại gồm 10 chữ số và bắt đầu bằng 0';
    setLoiTen(lt); setLoiSdt(ls);
    if (lt || ls) return;
    try { await taoKhach(t, s); }
    catch (e) {
      if (e instanceof ApiError && e.ma === 'TRUNG_SDT') { setQ(s); setKieu('tim'); setLoi('Số điện thoại này đã có khách. Bấm Tìm để gắn đúng khách đó.'); return; }
      throw e;
    }
    try { await onGan(s); }
    catch (e) { setQ(s); setKieu('tim'); setLoi(`Đã tạo khách ${t} nhưng chưa gắn được vào order: ${thongBaoLoi(e)}`); }
  });

  const chon = (k: KhachHang) => chay(() => onGan(k.so_dien_thoai));

  return (
    <Modal visible={hien} transparent animationType="fade" onRequestClose={onHuy}>
      <KeyboardAvoidingView style={s.nen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.hop} accessibilityViewIsModal>
          {kieu === 'tim' ? (
            <>
              <Chu kieu="tieuMuc">Gắn khách thành viên</Chu>
              <Chu kieu="nho">Nhập đủ 10 số điện thoại để gắn ngay, hoặc gõ tên để tìm. Điểm được cộng lúc thanh toán.</Chu>
              {loi ? <Banner>{loi}</Banner> : null}
              <TruongNhap nhan="Số điện thoại hoặc tên" value={q} onChangeText={(t) => { setQ(t); setDs(null); setChuaDangKy(false); }} returnKeyType="search" onSubmitEditing={tim} autoCapitalize="words" />
              {chuaDangKy && (
                <View style={s.trong}>
                  <Chu kieu="nhan">Số {q.trim()} chưa đăng ký thành viên.</Chu>
                  <Nut nhan="Tạo khách mới" onPress={moFormTao} />
                </View>
              )}
              {ds && ds.length > 0 && (
                <ScrollView style={{ maxHeight: 230 }} keyboardShouldPersistTaps="handled">
                  {ds.map((k) => (
                    <Pressable key={k.ma_khach_hang} accessibilityRole="button" accessibilityLabel={`Chọn ${k.ten_khach_hang} ${k.so_dien_thoai}`} onPress={() => chon(k)} style={s.khach}>
                      <View style={{ flex: 1 }}>
                        <Chu kieu="nhan">{k.ten_khach_hang}</Chu>
                        <Chu kieu="nho">{k.so_dien_thoai}</Chu>
                      </View>
                      <Chu kieu="nho">{k.diem_tich_luy} điểm</Chu>
                    </Pressable>
                  ))}
                  {ds.length >= 20 && <Chu kieu="nho" style={{ paddingVertical: 8 }}>Chỉ hiện 20 khách đầu, gõ thêm để lọc.</Chu>}
                </ScrollView>
              )}
              {ds && ds.length === 0 && (
                <View style={s.trong}>
                  <Chu kieu="nhan">Không tìm thấy khách nào khớp “{q.trim()}”.</Chu>
                  <Nut nhan="Tạo khách mới" onPress={moFormTao} />
                </View>
              )}
              <View style={s.hang}>
                <Nut nhan="Đóng" kieu="vien" onPress={onHuy} style={{ flex: 1 }} />
                <Nut nhan="Tìm" dangXuLy={dang} onPress={tim} style={{ flex: 1 }} />
              </View>
            </>
          ) : (
            <>
              <Chu kieu="tieuMuc">Tạo khách mới</Chu>
              <Chu kieu="nho">Tạo xong sẽ gắn luôn vào order này. Điểm bắt đầu từ 0.</Chu>
              {loi ? <Banner>{loi}</Banner> : null}
              <TruongNhap nhan="Tên khách hàng" value={ten} onChangeText={setTen} loi={loiTen} maxLength={100} autoCapitalize="words" />
              <TruongNhap nhan="Số điện thoại" value={sdt} onChangeText={setSdt} loi={loiSdt} keyboardType="phone-pad" maxLength={10} onSubmitEditing={tao} />
              <View style={s.hang}>
                <Nut nhan="Quay lại" kieu="vien" onPress={() => { setLoi(''); setKieu('tim'); }} style={{ flex: 1 }} />
                <Nut nhan="Tạo và gắn khách" dangXuLy={dang} onPress={tao} style={{ flex: 1.4 }} />
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  nen: { flex: 1, backgroundColor: 'rgba(26,43,42,0.5)', justifyContent: 'center', padding: 20 },
  hop: { backgroundColor: mau.be, borderRadius: bo.lon, padding: 18, gap: 12 },
  hang: { flexDirection: 'row', gap: 10, marginTop: 4 },
  trong: { backgroundColor: mau.tealHang, borderRadius: bo.nho, padding: 12, gap: 10 },
  khach: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, borderBottomWidth: 1, borderBottomColor: mau.lineSoft },
});
