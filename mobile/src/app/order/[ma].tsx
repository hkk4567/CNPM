// POS-11 xem order + POS-03/04/05 sửa món + POS-06 gắn khách + POS-07 đã phục vụ + POS-09 hủy.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTai } from '../../hooks/useTai';
import { useGioHang } from '../../context/GioHang';
import { chiTietOrder, daPhucVu, ganKhach, huyOrder, orderDangMo, suaDong, TEN_PHUONG_THUC, TEN_TRANG_THAI, thanhToan, xoaDong, type DongOrder, type KetQuaThanhToan, type Order, type PhuongThuc } from '../../api/hoa-don';
import { ApiError, thongBaoLoi } from '../../api/http';
import { Banner, Chip, Chu, Nut, The } from '../../components/ui';
import { HopXacNhan } from '../../components/HopXacNhan';
import { HopDaLam, HopGanKhach, HopSuaDong, HopThanhToan } from '../../components/HopHoiThoai';
import { gioTuIso, ngayGio, tien } from '../../utils/tien';
import { loaiChip } from '../(tabs)/order';
import { mau } from '../../theme';

type Hop =
  | { loai: 'sua'; dong: DongOrder }
  | { loai: 'giam'; dong: DongOrder; soLuong: number; ghiChu: string | null }
  | { loai: 'xoa'; dong: DongOrder }
  | { loai: 'khach' } | { loai: 'phucVu' } | { loai: 'huy' } | { loai: 'thanhToan' };

// Nội dung hóa đơn dạng chữ để gửi qua Zalo/Messenger/in (POS-11)
function vanBanHoaDon(o: Order) {
  const dong = o.chi_tiet.map((d) => `${d.so_luong} x ${d.ten_san_pham}${d.ghi_chu ? ` (${d.ghi_chu})` : ''}: ${tien(d.thanh_tien)}`);
  return ['HÓA ĐƠN #' + o.so_thu_tu, ngayGio(o.thoi_gian_tao), ...dong, `Tiền hàng: ${tien(o.tong_tien_hang)}`, ...(o.tong_giam_gia > 0 ? [`Giảm giá: -${tien(o.tong_giam_gia)}`] : []),
    `TỔNG: ${tien(o.tong_tien ?? o.tong_tien_tam_tinh)}`, `Thanh toán: ${o.phuong_thuc_thanh_toan ? TEN_PHUONG_THUC[o.phuong_thuc_thanh_toan as PhuongThuc] ?? o.phuong_thuc_thanh_toan : ''}`, ...(o.ten_khach_hang ? [`Khách: ${o.ten_khach_hang}`] : []), `Nhân viên: ${o.ten_nhan_vien}`].join('\n');
}

export default function ChiTietOrder() {
  const { ma: maChuoi } = useLocalSearchParams<{ ma: string }>();
  const ma = Number(maChuoi);
  const router = useRouter();
  const kv = useSafeAreaInsets();
  const gio = useGioHang();
  const { duLieu: o, dangTai, dangLamMoi, loi, taiLai, lamMoi, taiNgam } = useTai(() => chiTietOrder(ma), `ord|${ma}`);
  const [hop, setHop] = useState<Hop | null>(null);
  const [dang, setDang] = useState(false);
  const [loiHop, setLoiHop] = useState('');
  const [baoKho] = useState(gio.canhBaoKho);
  const [vuaTT, setVuaTT] = useState<KetQuaThanhToan | null>(null);
  useEffect(() => { if (gio.canhBaoKho.length) gio.datCanhBaoKho([]); }, [gio]); // nhận cảnh báo kho vừa gửi, rồi xóa khỏi giỏ

  const dong = () => { setHop(null); setLoiHop(''); };
  // Chạy một thao tác sửa; lỗi hiện trong hộp thoại đang mở, thành công thì đóng và tải lại order
  const chay = async (viec: () => Promise<unknown>) => {
    setDang(true); setLoiHop('');
    // HOA_DON_DA_DONG: order vừa bị đóng ở nơi khác -> tải lại để hiện đúng trạng thái
    try { await viec(); dong(); taiNgam(); }
    catch (e) { setLoiHop(thongBaoLoi(e)); if (e instanceof ApiError && e.ma === 'HOA_DON_DA_DONG') { dong(); taiNgam(); } }
    finally { setDang(false); }
  };

  const chiaSe = async () => { if (o) { try { await Share.share({ message: vanBanHoaDon(o) }); } catch { /* người dùng đóng hộp chia sẻ */ } } };

  const quay = () => (router.canGoBack() ? router.back() : router.replace('/order'));
  const mo = o ? orderDangMo(o.trang_thai) : false;
  const pha = o?.trang_thai === 'dang_pha_che';

  return (
    <View style={{ flex: 1 }}>
      <View style={[s.dau, { paddingTop: kv.top + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={quay} style={s.quay}><Ionicons name="chevron-back" size={24} color={mau.teal} /></Pressable>
        <Chu kieu="tieuMuc" style={{ flex: 1 }}>{o ? `Order #${o.so_thu_tu}` : 'Order'}</Chu>
        {o && <Chip nhan={TEN_TRANG_THAI[o.trang_thai]} loai={loaiChip(o.trang_thai)} />}
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 24 }} refreshControl={<RefreshControl refreshing={dangLamMoi} onRefresh={lamMoi} colors={[mau.teal]} />}>
        {loi ? <Banner taiLai={taiLai}>{loi}</Banner> : null}
        {dangTai && !o ? <ActivityIndicator color={mau.teal} style={{ marginTop: 40 }} /> : null}
        {vuaTT && o?.trang_thai === 'da_thanh_toan' && (
          <Banner loai="ok">
            Đã thanh toán {tien(vuaTT.hoa_don.tong_tien ?? 0)}.{vuaTT.diem_hien_tai !== null ? ` Cộng ${vuaTT.diem_cong} điểm, khách có ${vuaTT.diem_hien_tai} điểm.` : ' Khách lẻ, không tích điểm.'}
          </Banner>
        )}
        {baoKho.length > 0 && mo && (
          <Banner loai="canhBao">
            Sắp hết nguyên liệu: {baoKho.map((c) => `${c.ten_nguyen_lieu} (còn ${c.so_luong_ton} ${c.don_vi_tinh})`).join(', ')}. Báo quản lý nhập thêm.
          </Banner>
        )}
        {o && (
          <>
            <The style={{ gap: 4 }}>
              <Chu kieu="nho">{o.trang_thai === 'da_thanh_toan' ? ngayGio(o.thoi_gian_tao) : gioTuIso(o.thoi_gian_tao)} · {o.ten_nhan_vien}</Chu>
              {o.trang_thai === 'da_thanh_toan' && o.phuong_thuc_thanh_toan ? <Chu kieu="nho">Thanh toán: {TEN_PHUONG_THUC[o.phuong_thuc_thanh_toan as PhuongThuc] ?? o.phuong_thuc_thanh_toan}</Chu> : null}
              <View style={s.hang}>
                <Ionicons name="person-outline" size={18} color={mau.muted} />
                <Chu kieu="nhan" style={{ flex: 1 }}>{o.ten_khach_hang ?? 'Khách lẻ'}</Chu>
                {mo && <Pressable accessibilityRole="button" onPress={() => setHop({ loai: 'khach' })} style={s.nutPhu}><Chu kieu="nhan" style={{ color: mau.teal }}>{o.ma_khach_hang ? 'Đổi khách' : 'Gắn khách'}</Chu></Pressable>}
              </View>
            </The>

            {o.chi_tiet.map((d) => (
              <Pressable key={d.ma_chi_tiet} accessibilityRole={mo ? 'button' : 'text'} accessibilityLabel={`${d.ten_san_pham} x${d.so_luong}`} disabled={!mo} onPress={() => setHop({ loai: 'sua', dong: d })}>
                <The style={{ gap: 4 }}>
                  <View style={s.hang}>
                    <Chu kieu="nhan" style={{ flex: 1 }}>{d.so_luong} × {d.ten_san_pham}</Chu>
                    <Chu kieu="nhan">{tien(d.thanh_tien)}</Chu>
                    {mo && <Ionicons name="create-outline" size={18} color={mau.muted} />}
                  </View>
                  {d.ghi_chu ? <Chu kieu="nho">Ghi chú: {d.ghi_chu}</Chu> : null}
                  {d.giam_gia > 0 && <Chu kieu="nho" style={{ color: mau.okChu }}>{d.khuyen_mai.map((k) => k.ten_khuyen_mai).join(', ') || 'Khuyến mãi'} −{tien(d.giam_gia)}</Chu>}
                </The>
              </Pressable>
            ))}

            <The style={{ gap: 4, backgroundColor: mau.tealHang }}>
              <View style={s.hang}><Chu style={{ flex: 1 }}>Tiền hàng</Chu><Chu>{tien(o.tong_tien_hang)}</Chu></View>
              {o.tong_giam_gia > 0 && <View style={s.hang}><Chu style={{ flex: 1 }}>Giảm giá</Chu><Chu style={{ color: mau.okChu }}>−{tien(o.tong_giam_gia)}</Chu></View>}
              <View style={s.hang}><Chu kieu="tieuMuc" style={{ flex: 1 }}>{o.trang_thai === 'da_thanh_toan' ? 'Tổng tiền' : 'Tạm tính'}</Chu><Chu kieu="tieuMuc">{tien(o.tong_tien ?? o.tong_tien_tam_tinh)}</Chu></View>
            </The>

            {mo ? (
              <View style={{ gap: 10 }}>
                <Nut nhan="Thanh toán" onPress={() => setHop({ loai: 'thanhToan' })} />
                <Nut nhan="Thêm món" kieu="vien" onPress={() => { gio.xoaHet(); gio.datDich({ ma_hoa_don: o.ma_hoa_don, so_thu_tu: o.so_thu_tu }); router.dismissTo('/'); }} />
                {pha && <Nut nhan="Đã phục vụ" kieu="vien" onPress={() => setHop({ loai: 'phucVu' })} />}
                <Nut nhan="Hủy order" kieu="vien" onPress={() => setHop({ loai: 'huy' })} style={{ borderColor: mau.loi }} />
              </View>
            ) : o.trang_thai === 'da_thanh_toan' ? (
              <View style={{ gap: 10 }}>
                <Nut nhan="Chia sẻ hóa đơn" kieu="vien" onPress={chiaSe} />
                <Chu kieu="nho" style={{ textAlign: 'center' }}>Hóa đơn đã thanh toán, không thể sửa.</Chu>
              </View>
            ) : <Chu kieu="nho" style={{ textAlign: 'center' }}>Order {TEN_TRANG_THAI[o.trang_thai].toLowerCase()}, không thể sửa.</Chu>}
          </>
        )}
      </ScrollView>

      {o && hop?.loai === 'sua' && (
        <HopSuaDong key={hop.dong.ma_chi_tiet} hien ten={hop.dong.ten_san_pham} soLuong={hop.dong.so_luong} ghiChu={hop.dong.ghi_chu ?? ''}
          toiThieuLaMot={o.chi_tiet.length === 1} loi={loiHop} dangXuLy={dang} onHuy={dong} onXoa={() => setHop({ loai: 'xoa', dong: hop.dong })}
          onLuu={(sl, gc) => {
            const d = hop.dong; const doiGc = gc !== (d.ghi_chu ?? '');
            if (sl === d.so_luong && !doiGc) { dong(); return; }
            if (sl < d.so_luong && pha) { setHop({ loai: 'giam', dong: d, soLuong: sl, ghiChu: doiGc ? gc : null }); return; }
            chay(() => suaDong(ma, d.ma_chi_tiet, { ...(sl !== d.so_luong ? { so_luong: sl } : {}), ...(doiGc ? { ghi_chu: gc || null } : {}) }));
          }} />
      )}
      {hop?.loai === 'giam' && (
        <HopDaLam key={`giam${hop.dong.ma_chi_tiet}`} hien tieuDe="Bớt số ly" noiDung={`Bỏ ${hop.dong.so_luong - hop.soLuong} ly. Ly đã pha xong thì nguyên liệu vẫn bị trừ; ly chưa pha được trả lại kho.${loiHop ? `\n${loiHop}` : ''}`}
          dong={[{ khoa: hop.dong.ma_chi_tiet, nhan: `${hop.dong.ten_san_pham}: đã pha xong`, toiDa: hop.dong.so_luong - hop.soLuong }]} nhanXacNhan="Bớt" dangXuLy={dang} onHuy={dong}
          onXacNhan={(m) => chay(() => suaDong(ma, hop.dong.ma_chi_tiet, { so_luong: hop.soLuong, ...(hop.ghiChu !== null ? { ghi_chu: hop.ghiChu || null } : {}), da_lam: m[hop.dong.ma_chi_tiet] ?? 0 }))} />
      )}
      {hop?.loai === 'xoa' && (pha ? (
        <HopDaLam key={`xoa${hop.dong.ma_chi_tiet}`} hien tieuDe="Xóa món" noiDung={`Xóa ${hop.dong.ten_san_pham} khỏi order. Ly đã pha xong thì nguyên liệu vẫn bị trừ; ly chưa pha được trả lại kho.${loiHop ? `\n${loiHop}` : ''}`}
          dong={[{ khoa: hop.dong.ma_chi_tiet, nhan: 'Đã pha xong', toiDa: hop.dong.so_luong }]} nhanXacNhan="Xóa món" nguyHiem dangXuLy={dang} onHuy={dong}
          onXacNhan={(m) => chay(() => xoaDong(ma, hop.dong.ma_chi_tiet, m[hop.dong.ma_chi_tiet] ?? 0))} />
      ) : (
        <HopXacNhan hien tieuDe="Xóa món?" noiDung={`Xóa ${hop.dong.ten_san_pham} khỏi order.${loiHop ? ` ${loiHop}` : ''}`} nhanXacNhan="Xóa món" nguyHiem onHuy={dong} onXacNhan={() => chay(() => xoaDong(ma, hop.dong.ma_chi_tiet))} />
      ))}
      {o && hop?.loai === 'thanhToan' && (
        <HopThanhToan key="tt" hien tong={o.tong_tien_tam_tinh} tenKhach={o.ten_khach_hang} loi={loiHop} dangXuLy={dang} onHuy={dong}
          onXacNhan={(pt) => chay(async () => { setVuaTT(await thanhToan(ma, pt)); })} />
      )}
      {hop?.loai === 'khach' && <HopGanKhach hien loi={loiHop} dangXuLy={dang} onHuy={dong} onGan={(sdt) => chay(() => ganKhach(ma, sdt))} />}
      {hop?.loai === 'phucVu' && <HopXacNhan hien tieuDe="Đã phục vụ?" noiDung={`Đánh dấu Order #${o?.so_thu_tu} đã phục vụ khách.${loiHop ? ` ${loiHop}` : ''}`} nhanXacNhan="Đã phục vụ" onHuy={dong} onXacNhan={() => chay(() => daPhucVu(ma))} />}
      {o && hop?.loai === 'huy' && (pha ? (
        <HopDaLam key="huy" hien tieuDe={`Hủy Order #${o.so_thu_tu}?`} noiDung={`Nếu đã pha xong ly nào thì chọn số ly; nguyên liệu của ly đó vẫn bị trừ, phần còn lại trả về kho.${loiHop ? `\n${loiHop}` : ''}`}
          dong={o.chi_tiet.map((d) => ({ khoa: d.ma_chi_tiet, nhan: `${d.ten_san_pham} (gọi ${d.so_luong}): đã pha`, toiDa: d.so_luong }))} nhanXacNhan="Hủy order" nguyHiem dangXuLy={dang} onHuy={dong}
          onXacNhan={(m) => chay(() => huyOrder(ma, Object.entries(m).filter(([, v]) => v > 0).map(([k, v]) => ({ ma_chi_tiet: Number(k), so_luong: v }))))} />
      ) : (
        <HopXacNhan hien tieuDe={`Hủy Order #${o.so_thu_tu}?`} noiDung={`Order đã phục vụ, nguyên liệu không được trả lại kho.${loiHop ? ` ${loiHop}` : ''}`} nhanXacNhan="Hủy order" nguyHiem onHuy={dong} onXacNhan={() => chay(() => huyOrder(ma))} />
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  dau: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingRight: 16, paddingBottom: 6, backgroundColor: mau.be, borderBottomWidth: 1, borderBottomColor: mau.line },
  quay: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  hang: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nutPhu: { minHeight: 44, paddingHorizontal: 6, justifyContent: 'center' },
});
