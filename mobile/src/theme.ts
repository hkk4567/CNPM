// Màu và chữ lấy từ giao diện web đã duyệt (frontend/src/styles/index.css) để app và web cùng một bộ nhận diện.
export const mau = {
  teal: '#1B6B63', tealDam: '#14524C', tealNhat: '#E3F0EE', tealHang: '#F2F8F7',
  ink: '#1A2B2A', muted: '#5B6B69',
  line: '#DDE4E2', lineSoft: '#ECF0EF', lineInput: '#B9C6C3',
  nen: '#F1F4F3', be: '#FFFFFF',
  okNen: '#E3F3E9', okChu: '#1F6B3F',
  canhBaoNen: '#FFF1D6', canhBaoChu: '#8A5300',
  loiNen: '#FBE6E4', loiChu: '#A3231A', loi: '#B3261E',
} as const;

export const font = {
  thuong: 'BeVietnamPro_400Regular',
  vua: 'BeVietnamPro_500Medium',
  dam: 'BeVietnamPro_600SemiBold',
  rat: 'BeVietnamPro_700Bold',
} as const;

export const bo = { nho: 10, lon: 12 } as const; // bo góc
export const CAO_NUT = 48; // vùng chạm tối thiểu 44-48px
