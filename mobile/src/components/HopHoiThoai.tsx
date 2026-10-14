// Các hộp thoại của màn Order (dựng bằng Modal để chạy cả trên web).
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { bo, mau } from '../theme';
import { BoDem, Chu, Nut, TruongNhap } from './ui';

function Khung({ hien, onHuy, children }: { hien: boolean; onHuy: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={hien} transparent animationType="fade" onRequestClose={onHuy}>
      <KeyboardAvoidingView style={s.nen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.hop} accessibilityViewIsModal>{children}</View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// "Đã pha xong mấy ly?": ly đã làm thì nguyên liệu vẫn bị trừ; ly chưa làm được trả lại kho (luật của backend, POS-04/05/09).
export type DongDaLam = { khoa: number; nhan: string; toiDa: number };
export function HopDaLam({ hien, tieuDe, noiDung, dong, nhanXacNhan, nguyHiem, dangXuLy, onXacNhan, onHuy }: {
  hien: boolean; tieuDe: string; noiDung: string; dong: DongDaLam[]; nhanXacNhan: string; nguyHiem?: boolean; dangXuLy?: boolean;
  onXacNhan: (daLam: Record<number, number>) => void; onHuy: () => void;
}) {
  const [v, setV] = useState<Record<number, number>>({});
  return (
    <Khung hien={hien} onHuy={onHuy}>
      <Chu kieu="tieuMuc">{tieuDe}</Chu>
      <Chu>{noiDung}</Chu>
      <ScrollView style={{ maxHeight: 280 }}>
        {dong.map((d) => (
          <View key={d.khoa} style={s.hangDem}>
            <Chu kieu="nhan" style={{ flex: 1 }}>{d.nhan}</Chu>
            <BoDem ten={d.nhan} gia_tri={v[d.khoa] ?? 0} min={0} max={d.toiDa} onDoi={(x) => setV({ ...v, [d.khoa]: x })} />
          </View>
        ))}
      </ScrollView>
      <View style={s.hang}>
        <Nut nhan="Quay lại" kieu="vien" onPress={() => { setV({}); onHuy(); }} style={{ flex: 1 }} />
        <Nut nhan={nhanXacNhan} kieu={nguyHiem ? 'nguyHiem' : 'chinh'} dangXuLy={dangXuLy} onPress={() => { const kq = v; setV({}); onXacNhan(kq); }} style={{ flex: 1 }} />
      </View>
    </Khung>
  );
}

export function HopGanKhach({ hien, loi, dangXuLy, onGan, onHuy }: { hien: boolean; loi?: string; dangXuLy?: boolean; onGan: (sdt: string) => void; onHuy: () => void }) {
  const [sdt, setSdt] = useState('');
  const [loiNoi, setLoiNoi] = useState('');
  const gui = () => {
    const x = sdt.trim();
    if (!/^0\d{9}$/.test(x)) { setLoiNoi('Số điện thoại gồm 10 chữ số và bắt đầu bằng 0'); return; }
    setLoiNoi(''); onGan(x);
  };
  return (
    <Khung hien={hien} onHuy={onHuy}>
      <Chu kieu="tieuMuc">Gắn khách thành viên</Chu>
      <Chu kieu="nho">Nhập số điện thoại khách đã đăng ký. Điểm được cộng lúc thanh toán cho khách đang gắn trên order.</Chu>
      <TruongNhap nhan="Số điện thoại" value={sdt} onChangeText={setSdt} keyboardType="phone-pad" maxLength={10} loi={loiNoi || loi} onSubmitEditing={gui} />
      <View style={s.hang}>
        <Nut nhan="Hủy" kieu="vien" onPress={onHuy} style={{ flex: 1 }} />
        <Nut nhan="Gắn khách" dangXuLy={dangXuLy} onPress={gui} style={{ flex: 1 }} />
      </View>
    </Khung>
  );
}

// Sửa một dòng món: số lượng + ghi chú, hoặc xóa dòng.
export function HopSuaDong({ hien, ten, soLuong, ghiChu, toiThieuLaMot, loi, dangXuLy, onLuu, onXoa, onHuy }: {
  hien: boolean; ten: string; soLuong: number; ghiChu: string; toiThieuLaMot: boolean; loi?: string; dangXuLy?: boolean;
  onLuu: (soLuong: number, ghiChu: string) => void; onXoa: () => void; onHuy: () => void;
}) {
  const [sl, setSl] = useState(soLuong);
  const [gc, setGc] = useState(ghiChu);
  return (
    <Khung hien={hien} onHuy={onHuy}>
      <Chu kieu="tieuMuc">{ten}</Chu>
      {loi ? <Chu kieu="nho" style={{ color: mau.loi }}>{loi}</Chu> : null}
      <View style={s.hangDem}><Chu kieu="nhan" style={{ flex: 1 }}>Số lượng</Chu><BoDem ten={ten} gia_tri={sl} min={1} max={99} onDoi={setSl} /></View>
      <TruongNhap nhan="Ghi chú (ít đá, nhiều đường...)" value={gc} onChangeText={setGc} maxLength={255} autoCapitalize="sentences" />
      <View style={s.hang}>
        <Nut nhan="Đóng" kieu="vien" onPress={onHuy} style={{ flex: 1 }} />
        <Nut nhan="Lưu" dangXuLy={dangXuLy} onPress={() => onLuu(sl, gc.trim())} style={{ flex: 1 }} />
      </View>
      {!toiThieuLaMot && <Nut nhan="Xóa món khỏi order" kieu="vien" onPress={onXoa} style={{ borderColor: mau.loi }} />}
    </Khung>
  );
}

const s = StyleSheet.create({
  nen: { flex: 1, backgroundColor: 'rgba(26,43,42,0.5)', justifyContent: 'center', padding: 20 },
  hop: { backgroundColor: mau.be, borderRadius: bo.lon, padding: 18, gap: 12 },
  hang: { flexDirection: 'row', gap: 10, marginTop: 4 },
  hangDem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
});
