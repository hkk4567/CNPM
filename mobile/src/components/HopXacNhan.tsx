// Hộp xác nhận dựng bằng Modal (Alert của RN không chạy trên web nên không dùng).
import { Modal, StyleSheet, View } from 'react-native';
import { bo, mau } from '../theme';
import { Chu, Nut } from './ui';

export function HopXacNhan({ hien, tieuDe, noiDung, nhanXacNhan, nguyHiem, onXacNhan, onHuy }: {
  hien: boolean; tieuDe: string; noiDung: string; nhanXacNhan: string; nguyHiem?: boolean; onXacNhan: () => void; onHuy: () => void;
}) {
  return (
    <Modal visible={hien} transparent animationType="fade" onRequestClose={onHuy}>
      <View style={s.nen}>
        <View style={s.hop} accessibilityViewIsModal>
          <Chu kieu="tieuMuc">{tieuDe}</Chu>
          <Chu>{noiDung}</Chu>
          <View style={s.hang}>
            <Nut nhan="Hủy" kieu="vien" onPress={onHuy} style={{ flex: 1 }} />
            <Nut nhan={nhanXacNhan} kieu={nguyHiem ? 'nguyHiem' : 'chinh'} onPress={onXacNhan} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  nen: { flex: 1, backgroundColor: 'rgba(26,43,42,0.5)', justifyContent: 'center', padding: 24 },
  hop: { backgroundColor: mau.be, borderRadius: bo.lon, padding: 20, gap: 12 },
  hang: { flexDirection: 'row', gap: 10, marginTop: 6 },
});
