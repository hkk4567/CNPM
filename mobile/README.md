# App điện thoại cho nhân viên (Expo / React Native)

Đợt 1: đăng nhập, **Lịch làm việc của tôi** (NS-07), **Cá nhân** (đổi mật khẩu AUTH-02, đăng xuất).
Các đợt sau: Gọi món, Thanh toán + hóa đơn, Tạo nhanh khách hàng.

## Cấu trúc
```
mobile/
├─ app.json, package.json, tsconfig.json, eslint.config.js, .env.example
├─ scripts/smoke-web.mjs        # kiểm thử giao diện (playwright, API giả) + anh-smoke/*.png
└─ src/
   ├─ app/                      # Expo Router: mỗi file là một màn
   │  ├─ _layout.tsx            # font, PhienProvider, Stack.Protected (chưa đăng nhập -> dang-nhap)
   │  ├─ dang-nhap.tsx          # AUTH-01 + ô "Máy chủ" (đổi địa chỉ backend)
   │  ├─ doi-mat-khau.tsx       # AUTH-02 (modal)
   │  └─ (tabs)/{_layout,index,toi}.tsx   # tab Lịch làm việc, tab Cá nhân
   ├─ api/{cau-hinh,http,auth,nhan-su}.ts # gọi backend, cùng dạng {ok,data} với web
   ├─ context/Phien.tsx         # phiên đăng nhập, token trong SecureStore
   ├─ hooks/useTai.ts, components/{ui,HopXacNhan}.tsx, utils/ngay.ts, theme.ts, storage.ts
```

## Chạy
1. Chạy backend (`backend/`, cổng 3000) và MySQL như hướng dẫn ở NOTES.md.
2. `cd mobile && npm install`
3. Địa chỉ backend (chọn một):
   - Điện thoại thật (Expo Go): `cp .env.example .env`, sửa `EXPO_PUBLIC_API_URL=http://<IP máy tính>:3000/api` — hoặc nhập ngay trên màn đăng nhập, mục **Máy chủ** (`192.168.1.10:3000`).
   - Android emulator: mặc định `http://10.0.2.2:3000/api`. iOS simulator / web: `http://localhost:3000/api`.
   - Điện thoại và máy tính phải cùng Wi-Fi; Windows cần cho phép cổng 3000 qua tường lửa.
4. `npx expo start`, quét mã QR bằng Expo Go (hoặc bấm `a` / `i` / `w`).

## Kiểm tra
- `npm run kiem-tra` (tsc), `npm run lint`
- `npm run build-web` rồi `npm run smoke-web` (cần playwright; nếu cài ở nơi khác: `PW_DIR=<thư mục có playwright> node scripts/smoke-web.mjs`).

## Ghi chú
- Mọi vai trò (admin/quản lý/nhân viên) đều đăng nhập được; lịch luôn xin theo `ma_nhan_vien` của chính người đăng nhập.
- `npx expo install` bị chặn ở môi trường phát triển nên phiên bản gói được ghim bằng `npm install <gói>@~57.0.0`; trên máy bạn có thể chạy `npx expo install --fix` để đối chiếu.
