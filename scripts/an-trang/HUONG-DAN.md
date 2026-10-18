# Hướng dẫn dùng `scripts/an-trang/an-trang.js` (ẩn / hiện trang và tab web admin)

Thư mục `scripts/an-trang/` gồm: `an-trang.js` (script) và `HUONG-DAN.md` (file này).

Dùng khi cần **tạm khóa** một trang hoặc một tab của web admin (bảo trì, đang sửa dữ liệu...). Trang bị ẩn vẫn nằm trong menu nhưng **mờ đi + có icon khóa**; bấm vào thì hiện thông báo **"Trang này hiện không khả dụng"** kèm lý do.

## 1. Chuẩn bị

- Mở terminal (CMD, PowerShell hoặc terminal của VS Code) và đi tới **thư mục gốc dự án** (thư mục có `backend`, `frontend`, `scripts`):

  ```bash
  cd đường/dẫn/tới/CNPM-main
  ```
- Lệnh luôn chạy **từ thư mục gốc dự án** như các ví dụ dưới đây. (Chạy từ trong `scripts/an-trang/` bằng `node an-trang.js ...` cũng được.)
- Cần Node.js >= 20 (đã có sẵn vì dự án đang chạy bằng Node). **Không cần** bật XAMPP/MySQL, **không cần** `npm install`, **không cần** khởi động lại backend để chạy script.
- Để web thấy thay đổi thì backend vẫn phải đang chạy bình thường (web hỏi backend xem trang nào đang ẩn).
- Windows bị lỗi font tiếng Việt trong terminal? Chạy `chcp 65001` trước (chỉ ảnh hưởng cách hiển thị, không ảnh hưởng kết quả).

## 2. Bốn lệnh

| Mục đích | Lệnh (copy rồi sửa mã trang) |
|---|---|
| Xem mã trang và trạng thái hiện tại | `node scripts/an-trang/an-trang.js ds` |
| Ẩn một hoặc nhiều trang/tab | `node scripts/an-trang/an-trang.js an <ma> [<ma> ...] [--ly-do "Lý do"]` |
| Hiện lại một hoặc nhiều trang/tab | `node scripts/an-trang/an-trang.js hien <ma> [<ma> ...]` |
| Hiện lại tất cả | `node scripts/an-trang/an-trang.js hien-het` |

- Có thể ẩn/hiện **nhiều mã cùng lúc**, cách nhau bằng dấu cách.
- `--ly-do "..."` là dòng chữ người dùng sẽ thấy trên trang. Bỏ qua thì dùng lý do mặc định: *"Trang đang được bảo trì, vui lòng quay lại sau."* Lý do tối đa 200 ký tự, **luôn đặt trong dấu nháy kép**.
- Một lệnh `an` dùng **một lý do chung** cho mọi mã trong lệnh đó. Muốn mỗi trang một lý do thì chạy nhiều lệnh `an`.
- Ẩn lại một trang đã ẩn = cập nhật lý do mới.

## 3. Bảng mã trang và tab

Mã trang = tên đường dẫn của trang. Mã tab = `<trang>/<tab>`.

| Mã | Ý nghĩa |
|---|---|
| `hoa-don` | Hóa đơn |
| `san-pham` | Sản phẩm |
| `khuyen-mai` | Khuyến mãi |
| `kho` | Kho (cả trang) |
| `kho/ton-kho` | Kho › Tồn kho |
| `kho/nguyen-lieu` | Kho › Nguyên liệu |
| `kho/lich-su-nhap` | Kho › Lịch sử nhập |
| `kho/nha-cung-cap` | Kho › Nhà cung cấp |
| `khach-hang` | Khách hàng (cả trang) |
| `khach-hang/tra-cuu` | Khách hàng › Tra cứu |
| `khach-hang/than-thiet` | Khách hàng › Khách thân thiết |
| `lich-lam-viec` | Lịch làm việc (cả trang) |
| `lich-lam-viec/lich-tuan` | Lịch làm việc › Lịch tuần |
| `lich-lam-viec/ca` | Lịch làm việc › Ca làm việc |
| `nhan-vien` | Nhân viên |
| `tai-khoan` | Tài khoản và quyền |
| `bao-cao` | Báo cáo (cả trang) |
| `bao-cao/doanh-thu` | Báo cáo › Doanh thu |
| `bao-cao/san-pham` | Báo cáo › Sản phẩm bán chạy |
| `bao-cao/danh-muc` | Báo cáo › Theo danh mục |
| `bao-cao/thanh-toan` | Báo cáo › Phương thức thanh toán |
| `bao-cao/chi-phi` | Báo cáo › Chi phí nhập và doanh thu |
| `bao-cao/nhan-vien` | Báo cáo › Theo nhân viên |

**Quy tắc cha – con:**
- Ẩn mã trang (ví dụ `kho`) → ẩn **mọi tab** bên trong trang đó, kể cả khi gõ thẳng URL.
- Ẩn mã tab (ví dụ `kho/lich-su-nhap`) → chỉ ẩn tab đó, các tab còn lại dùng bình thường.
- Muốn mở lại tab con mà trang cha đang ẩn thì phải mở lại **trang cha** (script sẽ nhắc).
- Menu "Nhập hàng" chính là tab `kho/lich-su-nhap`; menu "Tồn kho" là `kho/ton-kho`.

## 4. Ví dụ copy dùng ngay

```bash
# Xem đang ẩn gì
node scripts/an-trang/an-trang.js ds

# Ẩn trang Nhân viên (lý do mặc định)
node scripts/an-trang/an-trang.js an nhan-vien

# Ẩn trang Nhân viên kèm lý do
node scripts/an-trang/an-trang.js an nhan-vien --ly-do "Đang cập nhật danh sách nhân viên"

# Ẩn nhiều trang cùng lúc
node scripts/an-trang/an-trang.js an nhan-vien khuyen-mai tai-khoan --ly-do "Đang bảo trì hệ thống"

# Ẩn cả trang Kho (4 tab)
node scripts/an-trang/an-trang.js an kho --ly-do "Đang kiểm kê kho"

# Chỉ ẩn 1 tab của Kho
node scripts/an-trang/an-trang.js an kho/lich-su-nhap --ly-do "Đang kiểm kê phiếu nhập"

# Ẩn 2 báo cáo cụ thể
node scripts/an-trang/an-trang.js an bao-cao/chi-phi bao-cao/nhan-vien --ly-do "Báo cáo đang được sửa"

# Hiện lại Nhân viên
node scripts/an-trang/an-trang.js hien nhan-vien

# Hiện lại nhiều mục
node scripts/an-trang/an-trang.js hien nhan-vien khuyen-mai kho/lich-su-nhap

# Xong bảo trì, mở lại tất cả
node scripts/an-trang/an-trang.js hien-het
```

Kết quả mẫu của `ds` (rút gọn):

```
kho/lich-su-nhap         Kho › Lịch sử nhập        ĐANG ẨN – Đang kiểm kê phiếu nhập
kho/ton-kho              Kho › Tồn kho             hiện
bao-cao/doanh-thu        Báo cáo › Doanh thu       ẩn theo trang "bao-cao"     <- bị ẩn vì trang cha đang ẩn
```

## 5. Người dùng thấy gì và khi nào

- Menu: mục bị ẩn mờ đi, có icon khóa, rê chuột hiện lý do. Vẫn bấm được → ra thông báo thay cho nội dung trang (menu vẫn còn để chuyển trang khác).
- Tab: tab bị ẩn mờ đi + icon khóa; bấm vào thì thông báo nằm trong khung nội dung.
- Thông báo có nút **Kiểm tra lại** (hỏi backend ngay) và **Về trang chủ**.
- Web cập nhật **tự động**, không cần F5: tối đa **30 giây** sau khi chạy lệnh, hoặc ngay khi người dùng bấm sang trang khác / quay lại tab trình duyệt.
- Mở lại (`hien`, `hien-het`) cũng tự cập nhật theo cách trên.

## 6. Xử lý sự cố

| Triệu chứng | Nguyên nhân và cách xử lý |
|---|---|
| `Lỗi: Mã trang không hợp lệ: abc` và in danh sách mã hợp lệ | Gõ sai mã. Chạy `node scripts/an-trang/an-trang.js ds` để xem mã đúng. Cả lệnh bị hủy, **không** ẩn dở dang. |
| `Lỗi: Chưa nêu mã trang nào` | Lệnh `an`/`hien` thiếu mã. |
| `--ly-do cần một giá trị` | Quên viết lý do sau `--ly-do`, hoặc quên dấu nháy kép. |
| `Lệnh "hien" không dùng --ly-do` | `hien` không có lý do, chỉ `an` mới có. |
| `Cannot find module` / lỗi đường dẫn | Chưa đứng ở thư mục gốc dự án. `cd` vào thư mục chứa `scripts` rồi chạy lại. |
| `Lỗi: ... trang-an.json phải là một object JSON` hoặc lỗi JSON | File `backend/config/trang-an.json` bị sửa tay sai. Script từ chối ghi để không mất dữ liệu. Sửa lại cho đúng, hoặc thay nội dung bằng `{}`. Trong lúc file hỏng, web coi như **không ẩn gì**. |
| Chạy lệnh xong web chưa đổi | Chờ tối đa 30 giây, hoặc bấm sang trang khác, hoặc bấm "Kiểm tra lại". Nếu vẫn không đổi: kiểm tra backend đang chạy và đúng thư mục `backend/config/trang-an.json` của backend đó. |
| Muốn thêm trang/tab mới vào danh sách có thể ẩn | Thêm vào `backend/src/config/trang.js`, rồi gắn `VienTab`/`RequireTrang` cho trang mới ở frontend. |

## 7. Ghi chú kỹ thuật ngắn

- Script chỉ ghi file `backend/config/trang-an.json`, ví dụ:
  ```json
  { "nhan-vien": { "ly_do": "Đang bảo trì", "luc": "2026-10-18T02:50:33.007Z" } }
  ```
  Sửa tay file này cũng được (đúng định dạng JSON và đúng mã trang), nhưng nên dùng script vì nó kiểm tra mã và ghi an toàn.
- Backend đọc file này mỗi khi web hỏi (`GET /api/he-thong/trang-an`), nên không cần restart.
- **Chỉ ẩn ở giao diện, không phải bảo mật:** API vẫn hoạt động (app điện thoại của nhân viên dùng chung nên không khóa). Ai gọi thẳng API vẫn lấy được dữ liệu.
- Người đang nhập dở form trong trang vừa bị ẩn sẽ mất phần chưa lưu vì trang bị thay bằng thông báo. Nên báo trước khi bảo trì.
- Kiểm thử: `cd backend && node --test tests/he-thong.test.js` và `cd frontend && node scripts/smoke-trang-an.mjs` (xem `NOTES.md`, Bước 16 và 17).
