# App điện thoại cho nhân viên (Expo / React Native)

Đợt 1: đăng nhập, **Lịch làm việc của tôi** (NS-07), **Cá nhân** (đổi mật khẩu AUTH-02, đăng xuất).
Đợt 2: **Gọi món** (POS-01 menu, POS-02 tạo order, POS-03/04/05 thêm/sửa/xóa món, POS-06 gắn khách, POS-07 đã phục vụ, POS-09 hủy, POS-10 danh sách order hôm nay, POS-11 chi tiết order).
Đợt 3: **Thanh toán** (POS-08: tiền mặt / chuyển khoản / ví, tiền thối, điểm tích lũy) và **xem / chia sẻ hóa đơn** đã thanh toán (POS-11).
Đợt sau: Tạo nhanh khách hàng (KH-01/KH-03).

## Cấu trúc
```
mobile/
├─ app.json, package.json, tsconfig.json, eslint.config.js, .env.example
├─ scripts/{lib-smoke,mock-api,smoke-web,smoke-goi-mon,smoke-thanh-toan}.mjs   # kiểm thử giao diện (playwright, API giả) + anh-smoke/*.png
└─ src/
   ├─ app/                      # Expo Router: mỗi file là một màn
   │  ├─ _layout.tsx            # font, PhienProvider, Stack.Protected (chưa đăng nhập -> dang-nhap)
   │  ├─ dang-nhap.tsx          # AUTH-01 + ô "Máy chủ" (đổi địa chỉ backend)
   │  ├─ doi-mat-khau.tsx       # AUTH-02 (modal)
   │  ├─ gio-hang.tsx           # giỏ gọi món -> gửi order mới hoặc thêm vào order đang mở
   │  ├─ order/[ma].tsx         # chi tiết order: sửa/xóa món, gắn khách, đã phục vụ, hủy
   │  └─ (tabs)/{_layout,index,order,lich,toi}.tsx   # 4 tab: Gọi món, Order, Lịch làm việc, Cá nhân
   ├─ api/{cau-hinh,http,auth,nhan-su,menu,hoa-don}.ts # gọi backend, cùng dạng {ok,data} với web
   ├─ context/{Phien,GioHang}.tsx  # phiên đăng nhập (token trong SecureStore); giỏ gọi món trong bộ nhớ
   ├─ hooks/useTai.ts, components/{ui,HopXacNhan,HopHoiThoai}.tsx, utils/ngay.ts, theme.ts, storage.ts
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
- `npm run build-web` rồi `npm run smoke-web` (đăng nhập, lịch, cá nhân) `npm run smoke-goi-mon` (gọi món, order) và `npm run smoke-thanh-toan` (thanh toán, hóa đơn). Cần playwright; nếu cài ở nơi khác: `PW_DIR=<thư mục có playwright> node scripts/smoke-goi-mon.mjs`.
- Chạy bản web của app (`npx expo start --web`, cổng 8081) cần backend cho phép CORS từ `http://localhost:8081`: `CORS_ORIGIN=http://localhost:5173,http://localhost:8081` trong backend/.env.

## Ghi chú
- Mọi vai trò (admin/quản lý/nhân viên) đều đăng nhập được; lịch luôn xin theo `ma_nhan_vien` của chính người đăng nhập.
- `npx expo install` bị chặn ở môi trường phát triển nên phiên bản gói được ghim bằng `npm install <gói>@~57.0.0`; trên máy bạn có thể chạy `npx expo install --fix` để đối chiếu.
