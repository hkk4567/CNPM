# Ghi chú dự án – Hệ thống quản lý quán cà phê

## Quyết định công nghệ (người dùng chốt)
- Node.js cho cả backend và frontend; XAMPP (MySQL/MariaDB) làm cơ sở dữ liệu.
- Đề xuất (chờ duyệt): backend Express + mysql2 (SQL thuần) + JWT/bcrypt + zod; frontend React + Vite + React Router; test node:test + supertest.

## Bước 1 – Kiến trúc thư mục (đã làm)
- scripts/scaffold.js dựng khung (chạy lại an toàn, không ghi đè): `node scripts/scaffold.js`
- Quy ước: tên thư mục/file tiếng Việt không dấu, kebab-case, khớp tên bảng/cột trong ERD.
- Mỗi module backend có 5 file: routes, controller, service, repository, schema; test ở backend/tests/<module>.test.js.
- Module khác nhau gọi nhau qua service, không gọi thẳng repository của nhau (ví dụ hoa-don gọi khuyen-mai.service, kho.service, khach-hang.service trong cùng một transaction).
- docs/: bản sao 2 file Word + ERD; build_doc.js và build_plan_doc.js (script sinh 2 file Word) cũng nằm trong docs/. Bản gốc còn ở ../cafe_spec/.
- Chạy lại script sinh Word: `cd docs && node build_doc.js && node build_plan_doc.js`


## Xác nhận của người dùng
- Dùng SQL thuần (mysql2) trên XAMPP, không dùng ORM.

## Bước 2 – CSDL (đã làm, đã chạy thử)
- database/schema.sql: 16 bảng InnoDB utf8mb4 từ ERD; index cho FK và thoi_gian_tao; UNIQUE: so_dien_thoai (KhachHang), ten_dang_nhap, TaiKhoan.ma_nhan_vien (1-1), ten_danh_muc, ten_nguyen_lieu; CHECK (số lượng >= 1, % <= 100, ngày bắt đầu < kết thúc...); có DROP TABLE đầu file (chỉ dùng khi dev).
- database/seed.sql: 4 danh mục, 8 sản phẩm, 3 ca, 4 nhân viên, 3 tài khoản, 3 khách, 6 nguyên liệu, 11 dòng công thức, 3 khuyến mãi (1 đã hết hạn), phân công mẫu.
- Tài khoản mẫu: admin/Admin@123, quanly/Quanly@123, nhanvien/Nhanvien@123 (đổi trước khi nộp).
- database/verify.sql: kiểm tra schema + SQL cốt lõi, ROLLBACK cuối; kỳ vọng đúng 6 dòng ERROR.
- scripts/db-init.js: chạy schema + seed (cần cd backend && npm install && cp .env.example .env).
- scripts/hash-password.js: tạo băm bcrypt cho seed (đã dùng để sinh 3 băm trong seed.sql).
- backend/package.json: mysql2, dotenv, bcryptjs ^2.4.3 (CommonJS).
- Đã test trên MariaDB 10.11 (sandbox, cùng họ với XAMPP): chạy db-init 2 lần OK; verify.sql ra đúng kỳ vọng (khuyến mãi 2500, tổng 81200, điểm 20, kho 4940/3910, ROLLBACK giữ nguyên dữ liệu, 6 lỗi ràng buộc).
- CHƯA test trên XAMPP thật của người dùng.

## Quyết định cần người dùng duyệt
1. giam_gia trong ChiTietHoaDon = TỔNG số tiền giảm của dòng (không phải mỗi ly); SQL thanh toán dùng so_luong*don_gia - giam_gia.
2. [ĐÃ CHỐT] Tồn kho KHÔNG được âm; thiếu nguyên liệu để pha món thì báo (xem mục Bước 2b).
3. so_thu_tu reset mỗi ngày: schema chưa ràng buộc UNIQUE (ngày, so_thu_tu); xử lý trong service bằng transaction (SELECT ... FOR UPDATE).
4. Xóa hóa đơn/chi tiết: FK dùng RESTRICT mặc định; chỉ KhuyenMaiSanPham xóa theo khuyến mãi (CASCADE).


## Bước 2b – Quy tắc "tồn kho không âm" (người dùng chốt)
- Yêu cầu: nếu nguyên liệu hiện có không đủ pha 1 ly thì báo không đủ nguyên liệu (ví dụ cần 5g, còn 4g).
- schema.sql: thêm CHECK ck_nl_ton (so_luong_ton >= 0) = chốt chặn cuối ở CSDL.
- Kiểm tra 2 lớp: (1) khi tạo/sửa order (POS-02/03/04) báo sớm; (2) khi thanh toán (POS-08) kiểm tra lại trong transaction, thiếu thì ROLLBACK. Lý do: nhiều order đang mở có thể cùng dùng một nguyên liệu, kho chỉ trừ lúc thanh toán.
- Lỗi chuẩn: HTTP 409, loi = KHONG_DU_NGUYEN_LIEU, chi_tiet[] = {ten_nguyen_lieu, don_vi_tinh, so_luong_ton, can_dung, con_thieu}. Thông báo mẫu: "Không đủ nguyên liệu: Cà phê bột cần 20 g, còn 4 g (thiếu 16 g)".
- POS-01 (menu) trả thêm so_ly_toi_da = MIN(FLOOR(so_luong_ton / dinh_luong)); sản phẩm chưa có công thức thì không giới hạn.
- SQL mẫu nằm ở docs (Phụ lục A.3, A.4) và database/verify.sql (mục [6], [7]).
- verify.sql giờ kỳ vọng đúng 7 dòng ERROR; đã chạy: so_ly_toi_da = 250/133/133/16, thiếu cà phê bột 16g, trừ kho thẳng bị ck_nl_ton chặn (tồn vẫn 4).
- Đã sửa docs/build_doc.js và sinh lại docs/Dac_ta_tinh_nang_quan_ly_quan_ca_phe.docx (9 trang). Chạy lại: cd docs && node build_doc.js
- Lưu ý: bản Word trong ../cafe_spec/ là bản cũ (chưa có quy tắc này); dùng bản trong cafe_management/docs/.
- Giới hạn đã biết: kiểm tra lúc nhập order chỉ so với tồn hiện tại, chưa trừ phần nguyên liệu các order đang mở khác đang "giữ"; thanh toán mới là chốt cuối.
- Chưa test trên XAMPP thật của người dùng.


## Bước 3 – Nền backend + AUTH-01 (đã làm, đã test)
- Stack chốt: Express 5, mysql2 (SQL thuần), jsonwebtoken, bcryptjs ^2.4.3, zod 4, cors, dotenv; test: node:test + supertest. Node >= 20.
- Chạy: cd backend && npm install && cp .env.example .env (sửa DB_PASSWORD nếu root có mật khẩu, đổi JWT_SECRET) && npm run db:init && npm start. Kiểm tra: http://localhost:3000/api/health
- Test: cd backend && npm test (cần MySQL bật + đã db:init). Kết quả: 21/21 qua trên MariaDB 10.11 (sandbox). Smoke test curl thật: health, đăng nhập, /toi, sai mật khẩu đều đúng.
- File chính: config/env.js, config/db.js, utils/{loi-nghiep-vu,phan-hoi,phan-trang,transaction}.js, middlewares/{validate,xac-thuc,phan-quyen,xu-ly-loi}.js, modules/auth/*, routes.js, app.js, server.js.
- API: POST /api/auth/dang-nhap (AUTH-01), GET /api/auth/toi (thêm ngoài đặc tả, để frontend lấy thông tin người đăng nhập), GET /api/health.
- Quy ước phản hồi: { ok:true, data } | danh sách: data là mảng + tong_so_ban_ghi, trang, moi_trang | lỗi { ok:false, loi, thong_bao, chi_tiet? }.
- Quyết định thiết kế: (1) xacThucToken tra lại CSDL mỗi request -> đổi quyền/cho nghỉ việc có hiệu lực ngay (tốn 1 truy vấn/request, chấp nhận được); (2) sai tên và sai mật khẩu trả cùng 1 lỗi, so sánh bcrypt giả khi không có tài khoản; (3) khóa tài khoản nghỉ việc chỉ báo SAU khi đúng mật khẩu (403 TAI_KHOAN_BI_KHOA); (4) loi.khongDuNguyenLieu() dựng sẵn thông báo chuẩn (ví dụ "cần 5 g, còn 4 g (thiếu 1 g)").
- Giới hạn đã biết: chưa chống dò mật khẩu (rate limit), đề xuất thêm sau; token hết hạn sau JWT_EXPIRES_IN (8h).
- Đã sửa scaffold.js và .env.example (thêm CORS_ORIGIN).
- Chưa test trên XAMPP thật của người dùng; package-lock.json sẽ do `npm install` của người dùng tạo.


## Đóng gói
- scripts/make-zip.sh tạo ../cafe_management.zip (bỏ node_modules, .env, dist, log). Chạy: bash scripts/make-zip.sh
- QUY ƯỚC GIAO FILE (người dùng yêu cầu): sau MỖI bước, cập nhật trực tiếp trong thư mục dự án, ghi NOTES.md, rồi đóng gói lại zip và gửi.
- Lịch sử zip: giao sau Bước 3; giao lại sau Bước 4 (gồm module san-pham); giao lại sau Bước 5 (gồm module hoa-don); giao lại sau Bước 6a (chỉnh sửa order); giao lại sau khi sửa lỗi 2 test (6a-fix); giao lại sau Bước 6b (thanh toán); giao lại sau đổi quy tắc kho (6b-kho).

## Bước 4 – Module san-pham (đã làm, đã test)
- Phạm vi: SP-01..SP-05 (danh mục + sản phẩm; trong backlog gộp chung là "SP-01", 5 điểm) và POS-01 (menu). Đã thêm mục 3.1 vào đặc tả, đánh số lại các mục 3.x (POS thành 3.2...).
- API: GET/POST /api/danh-muc, PUT/DELETE /api/danh-muc/:ma | GET /api/san-pham/menu (A/Q/N) | GET/POST /api/san-pham, GET/PATCH/DELETE /api/san-pham/:ma (A/Q). Danh mục xem được bởi mọi quyền; ghi: A/Q.
- Menu: chỉ con_ban; trả so_ly_toi_da = MIN(FLOOR(ton / dinh_luong)) (null = chưa có công thức = không giới hạn) và du_nguyen_lieu (false khi so_ly_toi_da = 0). gia_sau_giam / ma_khuyen_mai CHƯA có: bổ sung ở Sprint 3 cùng module khuyen-mai (không trả giá trị giả).
- Quyết định: (1) sản phẩm đã bán không xóa được -> 409 SAN_PHAM_DA_BAN, dùng trang_thai = ngung_ban; (2) xóa sản phẩm chưa bán xóa kèm CongThuc + KhuyenMaiSanPham trong 1 transaction (FOR UPDATE; bắt thêm lỗi 1451 nếu có order chen vào); (3) sửa dùng PATCH (gửi trường nào đổi trường đó, rỗng -> 400); (4) gia_ban phải là số (chuỗi "5000" bị từ chối); (5) tu_khoa tìm không phân biệt dấu (collation utf8mb4_unicode_ci), thoát ký tự % và _.
- Test: backend/tests/san-pham.test.js (8 test mới). Tổng 29/29 qua, chạy 2 lần liên tiếp không db:init vẫn qua, không để lại dữ liệu thừa (đã kiểm tra: không còn dòng TEST_, tồn Trân châu về 800, nhân viên 4 vẫn nghi_viec).
- Chạy lại: cd backend && npm test. Sinh lại Word: cd docs && node build_doc.js.
- Lỗi gặp khi làm: script sinh Word bị lỗi dấu nháy ở dòng SP-03 (tui viết sai), đã sửa và build lại.
- Chưa test trên XAMPP thật của người dùng; chưa có package-lock.json.


## Bước 5 – Module hoa-don: POS-02 + POS-10 (đã làm, đã test) – kết thúc Sprint 1
- API: POST /api/hoa-don (tạo order, 201) và GET /api/hoa-don (danh sách) – mọi quyền A/Q/N. POS-03..09, POS-11 làm ở Sprint 2 (chưa có GET /api/hoa-don/:ma).
- POS-02: kiểm tra theo thứ tự (1) sản phẩm tồn tại (404) và còn bán (400 SAN_PHAM_NGUNG_BAN), (2) khách tồn tại (404), (3) đủ nguyên liệu cho TẤT CẢ dòng gộp lại (409 KHONG_DU_NGUYEN_LIEU), (4) ghi trong transaction. ma_nhan_vien lấy từ token (bỏ qua nếu client gửi). don_gia chụp lại lúc đặt; giam_gia = 0, ma_khuyen_mai = NULL cho đến Sprint 3. Cùng sản phẩm nhiều dòng (ghi chú khác) được phép.
- so_thu_tu (reset mỗi ngày): withTransaction nhận thêm tùy chọn { khoa } = GET_LOCK giữ suốt transaction (lấy trước BEGIN, nhả sau COMMIT/ROLLBACK); test 8 order đồng thời cho so_thu_tu duy nhất và liên tiếp. Nếu không lấy được khóa sau 10 giây: 503 HE_THONG_BAN.
- POS-10: ngay (YYYY-MM-DD hợp lệ, mặc định hôm nay), trang_thai, ma_nhan_vien, phân trang (mặc định 50, tối đa 200); sắp so_thu_tu tăng dần; so_mon = tổng số ly; tong_tien = số đã chốt nếu da_thanh_toan, ngược lại tạm tính từ dòng. Nhân viên xin ngày khác hôm nay: 403 (xin đúng hôm nay vẫn được).
- Ranh giới module: hoa-don chỉ gọi qua service: san-pham.service.layNhieuSanPham, khach-hang.service.layKhachHang, kho.service.kiemTraDuNguyenLieu (hàm thuần tinhThieu có test riêng). Ba hàm này đặt sẵn trong module của chúng, phần còn lại của các module đó làm ở Sprint 2-3.
- Thêm loi.yeuCauSai (400 có mã riêng). Sửa đặc tả (POS-02, POS-10) và sinh lại Word (10 trang). Chạy lại: cd docs && node build_doc.js
- Test: 45/45 qua (29 cũ + 16 mới), chạy 3 lần liên tiếp không db:init vẫn qua, không để lại dữ liệu thừa. Tự rà lại và sửa 1 lỗi tiềm ẩn: test hoa-don lúc đầu đổi giá sản phẩm MẪU, có thể làm hỏng test menu chạy song song -> đã chuyển sang dùng sản phẩm riêng TEST_HD_SP. Quy ước: dữ liệu test tạm đặt tên TEST_<MODULE>_..., mỗi file chỉ dọn dữ liệu của mình; test menu bỏ qua mọi tên bắt đầu TEST_.
- Smoke test curl thật: POST (tổng 93.000đ, 2 dòng) và GET danh sách đều đúng; đã dọn dữ liệu thử.
- Giới hạn đã biết: (a) kiểm tra nguyên liệu lúc đặt chỉ so tồn hiện tại, thanh toán (Sprint 2) mới là chốt cuối; (b) thoi_gian_tao trả dạng ISO (mysql2 đổi sang UTC khi serialize): giao diện cần hiển thị theo giờ địa phương; (c) GET_LOCK dùng chung toàn máy chủ MySQL nhưng tên khóa đã gắn tên CSDL.
- Chưa test trên XAMPP thật của người dùng.

## Bước 6a – Chỉnh sửa order: POS-03, 04, 05, 07, 09 (đã làm, đã test)
- API (đều A/Q/N): POST /api/hoa-don/:ma/dong (POS-03, 201) | PATCH /api/hoa-don/:ma/dong/:ma_chi_tiet (POS-04) | DELETE /api/hoa-don/:ma/dong/:ma_chi_tiet (POS-05) | PATCH /api/hoa-don/:ma/trang-thai {trang_thai_moi} (POS-07) | POST /api/hoa-don/:ma/huy (POS-09). Đường dẫn lồng theo hóa đơn để dòng phải thuộc đúng hóa đơn (sai -> 404).
- Mọi thao tác chạy trong transaction và KHÓA dòng HoaDon (SELECT ... FOR UPDATE) trước, rồi mới kiểm tra trạng thái. Lý do: sửa và thanh toán (6b) cùng lúc trên một hóa đơn không xen kẽ được. Hóa đơn da_thanh_toan/huy: 409 HOA_DON_DA_DONG cho mọi thao tác.
- POS-03: luôn thêm dòng MỚI; kiểm tra nguyên liệu cho TOÀN BỘ order sau khi thêm. POS-04: chỉ kiểm tra kho khi TĂNG số lượng (giảm số lượng và đổi ghi chú luôn được, kể cả khi kho đã tụt thấp); đổi số lượng giữ nguyên mức giảm mỗi ly (giam_gia tính lại theo tỷ lệ, Sprint 3 sẽ tính từ khuyến mãi); ghi_chu null/rỗng = xóa. POS-05: không xóa dòng cuối (409 KHONG_XOA_DONG_CUOI). POS-07: dang_pha_che -> da_phuc_vu; dang_pha_che/da_phuc_vu -> huy; không quay ngược; chuyển sang da_thanh_toan bị từ chối (409 CHUYEN_TRANG_THAI_KHONG_HOP_LE, phải dùng thanh toán). POS-09 = POS-07 với đích huy; không đụng kho.
- Test mới: tests/hoa-don-sua.test.js (13 test, dữ liệu riêng TEST_HS_*). Có test 4 yêu cầu thêm dòng đồng thời trên 1 order: kho đủ đúng 2 -> đúng 2 thành công, 2 bị 409. Tổng 58/58 qua; chạy 5 lần liên tiếp không db:init đều qua; không để lại dữ liệu thừa.
- Sửa test cũ: hoa-don.test không còn đòi so_thu_tu "liên tiếp" (file test khác chạy song song có thể chen order vào), thay bằng kiểm tra không trùng trên TOÀN BỘ hóa đơn trong ngày.
- Đặc tả: sửa POS-03/04/05/07/09; thêm Phụ lục B (danh sách API đã cài đặt, sẽ cập nhật theo từng bước); Word 11 trang.
- Còn thiếu so với Sprint 2 (xếp vào 6b và sau): POS-08 thanh toán (chốt tiền, cộng điểm, trừ kho), POS-11 xem/in bill (GET /api/hoa-don/:ma), POS-06 gắn khách theo SĐT, KH-01..KH-04.
- Chưa test trên XAMPP thật của người dùng.

## Sửa lỗi 2 test fail trên máy người dùng (6a-fix)
- Hiện tượng (báo từ máy Windows + XAMPP): 2 test của tests/hoa-don.test.js fail: "tạo order: kiểm tra đầu vào" (16 !== 15) và "không đủ nguyên liệu" (18 !== 17). Các test còn lại qua. Ngoài ra thấy máy người dùng có thêm file stub tests/bao-cao|khach-hang|khuyen-mai|nhan-su.test.js (rỗng, qua bình thường).
- NGUYÊN NHÂN: các file test chạy SONG SONG (mặc định của node --test) trên cùng một CSDL. hoa-don.test.js đếm hóa đơn của TOÀN BẢNG trước/sau một yêu cầu thất bại; hoa-don-sua.test.js (thêm ở 6a) tạo order cùng lúc nên số đếm lệch 1. Đây là lỗi của TEST, không phải của mã nguồn (hóa đơn không bị tạo sai).
- TỰ NHẬN LỖI: ở 6a tui báo "chạy 5 lần đều qua" nhưng đó chỉ là may về thời điểm (máy tui nhanh hơn, hai file ít chạm nhau); lỗi chắc chắn tồn tại. Đã tái hiện chắc chắn bằng scripts/stress-hoa-don.sh (tiến trình giả thêm hóa đơn liên tục): trước khi sửa 3/3 lần đều fail, sau khi sửa 0/3.
- SỬA: hoa-don.test.js tạo NHÂN VIÊN + TÀI KHOẢN RIÊNG (TEST_HD_NV / test_hd_nv, tự dọn) và đếm hóa đơn theo nhân viên đó; 3 test dùng đếm đều đặt order bằng tài khoản riêng. Không đổi mã nguồn backend.
- Kiểm chứng: cả bộ 58/58 qua 5 lần liền KHI đang có tiến trình gây nhiễu + 3 lần không nhiễu; không còn dữ liệu thừa (NhanVien 4, TaiKhoan 3, HoaDon 0).
- QUY ƯỚC TEST MỚI: mỗi file test chỉ được đếm/khẳng định trên dữ liệu CỦA MÌNH (sản phẩm/nguyên liệu/nhân viên riêng, tên TEST_<MODULE>_...), không đếm toàn bảng dùng chung, không giả định số liệu tuyệt đối trên bảng có file khác ghi. Cách tự kiểm tra sau này: chạy scripts/stress-hoa-don.sh ở một cửa sổ, npm test ở cửa sổ khác.
- Chưa chạy lại trên XAMPP thật sau khi sửa: nhờ người dùng chạy lại npm test (kỳ vọng 58/58).

## Bước 6b – Thanh toán POS-08 + xem/in hóa đơn POS-11 (đã làm, đã test)
- API (A/Q/N): POST /api/hoa-don/:ma/thanh-toan {phuong_thuc_thanh_toan: tien_mat|chuyen_khoan|vi} -> { hoa_don, diem_cong, diem_hien_tai, canh_bao_kho[] } | GET /api/hoa-don/:ma (hóa đơn đầy đủ để in bill).
- Thanh toán = MỘT transaction, thứ tự khóa cố định HoaDon -> NguyenLieu (mã tăng dần) -> KhachHang: (1) khóa hóa đơn, còn mở mới tiếp (đã thanh toán/đã hủy: 409 HOA_DON_DA_DONG); (2) tong_tien = tổng (so_luong*don_gia - giam_gia); (3) kho.service.truKho: khóa nguyên liệu, đọc lại tồn mới nhất, kiểm tra đủ (thiếu: 409 KHONG_DU_NGUYEN_LIEU + ROLLBACK, không trừ dở dang), rồi trừ; CHECK ck_nl_ton là chốt chặn cuối (lỗi 4025 MariaDB / 3819 MySQL8 được đổi thành 409); (4) ghi da_thanh_toan (UPDATE có điều kiện chưa thanh toán); (5) khách thành viên: điểm += FLOOR(tong_tien / 10000) (hằng số DIEM_MOI_VND trong hoa-don.service).
- canh_bao_kho: nguyên liệu vừa trừ mà tồn <= muc_ton_toi_thieu. diem_hien_tai = null với khách vãng lai.
- Dạng hóa đơn trả về (POST/PATCH/GET): thêm tong_tien_hang, tong_giam_gia, tong_tien_tam_tinh (luôn tính từ dòng) và tong_tien (số đã chốt; null cho tới khi thanh toán). Danh sách POS-10 vẫn trả tong_tien = đã chốt nếu đã thanh toán, ngược lại tạm tính.
- QUYẾT ĐỊNH TUI TỰ ĐẶT (ngoài đặc tả, dễ đổi): POS-11 nhân viên chỉ xem hóa đơn tạo HÔM NAY (403 nếu cũ hơn), cùng quy tắc với POS-10, để nhân viên không vòng qua giới hạn bằng cách gọi theo mã. Quản lý/admin xem mọi ngày.
- Test mới: tests/hoa-don-thanh-toan.test.js (14 test, dữ liệu riêng TEST_TT_*): chốt tiền sau khi sửa, giảm giá, 3 phương thức, điểm cộng dồn/làm tròn xuống, khách vãng lai, thanh toán 2 lần, hủy rồi trả, kho tụt, tất cả-hoặc-không (thiếu NL2 thì NL1 không bị trừ), 2 thanh toán đồng thời cùng nguyên liệu (đúng 1 thành công, tồn không âm), 4 lần bấm đồng thời (đúng 1 hiệu lực, kho và điểm tính 1 lần), sửa+trả đồng thời, xem hóa đơn (+quyền hôm nay).
- Kiểm tra chất lượng test: thử ĐỘT BIẾN bỏ FOR UPDATE của khóa hóa đơn -> test đồng thời FAIL 3/3 lần (test có tác dụng); đã khôi phục file gốc (đối chiếu bằng diff).
- Kết quả: tổng 72/72 qua; chạy 4 lần sạch + 4 lần khi có script gây nhiễu (scripts/stress-hoa-don.sh) đều qua; không còn dữ liệu thừa, tồn kho mẫu nguyên vẹn.
- kho.service refactor: tách tinhNhuCau (hàm thuần), tinhThieu dùng lại; thêm truKho. kho.test.js cũ vẫn qua. khach-hang: thêm congDiem. kho.repository: khoaNguyenLieu, truTon.
- Đặc tả: POS-08, POS-11, ghi chú cài đặt ở A.1, Phụ lục B thêm 2 API; Word 12 trang.
- Sự cố nhỏ khi làm: lệnh kiểm tra cuối bị lỗi hiển thị (kết quả không in được) nên chạy lại toàn bộ các lượt kiểm tra với đầu ra chỉ ASCII; không ảnh hưởng mã nguồn.
- Sprint 2 còn lại: POS-06 (gắn khách theo SĐT) và KH-01..KH-04 (bước 6c). KH-05 để Sprint 4 theo kế hoạch.
- Chưa test trên XAMPP thật của người dùng; người dùng đã chạy được bộ test trước đó (58 test, chỉ 2 lỗi đã sửa ở 6a-fix).

## Đổi quy tắc kho (6b-kho): TRỪ NGAY khi gọi món (hướng B) – đã làm, đã test
- Người dùng xác nhận các giả định 1–6 và chọn cách hiểu khác ở mục 7: KHÔNG cần ghi vết / nhật ký kho, chỉ cập nhật số tồn. => KHÔNG đổi ERD, KHÔNG thêm bảng, KHÔNG cần db:init lại vì thay đổi cấu trúc (chỉ nạp lại dữ liệu mẫu nếu muốn tồn kho về như ban đầu).
- Luật: (1) gọi món (tạo order / thêm món / tăng số lượng) = TRỪ KHO NGAY, chỉ phần ly mới thêm; thiếu: 409 KHONG_DU_NGUYEN_LIEU, không trừ gì, không tạo/đổi gì. (2) bỏ ly (xóa dòng / giảm số lượng / hủy order): ly CHƯA làm -> TRẢ nguyên liệu; ly ĐÃ làm -> nguyên liệu vẫn bị trừ. (3) chọn theo SỐ LY bằng da_lam (mặc định 0 = chưa làm = trả hết). (4) order da_phuc_vu coi như làm xong hết: bỏ ly/hủy thì KHÔNG trả, da_lam bị bỏ qua. (5) "xóa hóa đơn" = hủy order (trạng thái huy, dữ liệu giữ). (6) thanh toán KHÔNG trừ và KHÔNG kiểm tra kho nữa; canh_bao_kho chuyển sang phản hồi lúc gọi món (POS-02/03/04-tăng) và bị bỏ khỏi phản hồi thanh toán.
- API da_lam: POST /api/hoa-don/:ma/huy {da_lam:[{ma_chi_tiet, so_luong}]} | PATCH .../trang-thai {trang_thai_moi:'huy', da_lam:[...]} (da_lam với trạng thái khác huy: 400) | PATCH .../dong/:ma_chi_tiet {so_luong, da_lam} (da_lam chỉ khi GIẢM số lượng, 0..số ly bị bỏ) | DELETE .../dong/:ma_chi_tiet?da_lam=N. da_lam sai (lặp dòng, dòng không thuộc hóa đơn, vượt số ly, âm): 400 DU_LIEU_SAI và không đổi gì.
- QUYẾT ĐỊNH TUI TỰ ĐẶT (ngoài các giả định đã xác nhận, nêu rõ cho người dùng): (a) gọi thêm món vào order đang da_phuc_vu (hoặc tăng số lượng) thì order QUAY LẠI dang_pha_che, vì có món mới chưa làm; nhờ vậy lúc hủy nhân viên vẫn được chọn ly nào đã làm; (b) giảm số lượng / xóa dòng trong order da_phuc_vu cũng coi như đã làm xong, không trả; (c) không lưu công thức lúc gọi: nếu công thức đổi giữa lúc gọi và lúc trả thì số trả tính theo công thức HIỆN TẠI (hệ quả của việc không có nhật ký kho).
- Mã: kho.service thêm traKho, truKho dùng lúc gọi món (khóa nguyên liệu theo mã tăng dần rồi đọc lại tồn, kiểm tra đủ, trừ; CHECK ck_nl_ton là chốt chặn cuối); bỏ kiemTraDuNguyenLieu (không còn dùng). hoa-don.service viết lại phần kho; thanhToan bỏ phần kho. Thứ tự khóa: HoaDon -> NguyenLieu (id tăng dần) -> KhachHang (tạo order: khóa tên so_thu_tu -> NguyenLieu); không có chu trình khóa.
- LỖI TỰ MẮC VÀ ĐÃ SỬA: khi viết lại hàm xóa dòng, tui để sót tên biến tạm (maChichiTietPlaceholder) do thay chuỗi sai; test bắt được ngay (4 test fail), đã sửa. Bài học: kiểm tra lại bằng grep sau mỗi lần thay chuỗi tự động.
- Test: viết lại hoa-don.test.js, hoa-don-sua.test.js, hoa-don-thanh-toan.test.js; thêm 5 test DB cho truKho/traKho trong kho.test.js. Quy ước MỚI: test KHÔNG được đặt món có công thức của dữ liệu mẫu (vì gọi món là trừ kho thật, dọn order không hoàn lại tồn kho mẫu) – dùng sản phẩm/nguyên liệu riêng TEST_<MODULE>_*; món 7 (Bánh tiramisu) không có công thức nên dùng được.
- Kiểm chứng: 89/89 qua; 3 lần sạch + 3 lần có script gây nhiễu đều qua; tồn kho mẫu nguyên vẹn sau test (5000 4000 8000 6000 2000 800); không còn dữ liệu thừa. Thử ĐỘT BIẾN 4 chỗ (bỏ luật da_phuc_vu, bỏ khóa hóa đơn, hủy không trả kho, tăng không trừ kho): test bắt được 3, 2, 7, 2 test fail tương ứng; đã khôi phục và đối chiếu diff nguyên vẹn. Smoke test server thật đúng ví dụ của người dùng: 5000 -> gọi 3 ly 4940 -> thêm 1 ly 4920 -> hủy, 2/4 ly đã làm 4960.
- Đặc tả Word (12 trang): sửa POS-02/03/04/05/07/08/09, quy tắc kho ở mục 1, A.1, A.4, thêm A.5, Phụ lục B.
- Chưa test trên XAMPP thật của người dùng; người dùng nên chạy lại npm test (kỳ vọng 89/89).

## Bước tiếp theo (chờ người dùng duyệt)
- Bước 6c: khách hàng: KH-01 tạo khách, KH-03 tìm khách, POS-06 gắn khách vào order theo SĐT, KH-02 sửa khách, KH-04 lịch sử mua. Sau đó Sprint 3: khuyến mãi + kho.

## Đọc dự án trước Sprint 3 (chưa sửa mã)
- Trạng thái thật của zip: xong tới 6b-kho. Chưa làm: 6c (khach-hang: KH-01..04, POS-06), kho (KHO-01..06), nhan-su, bao-cao, toàn bộ frontend (mọi file chỉ là stub 1 dòng), khuyen-mai (5 file stub, test stub).
- Có thứ KHÔNG ghi trong NOTES: bảng HoaDonDaThanhToan (schema.sql cuối file, 2 trigger chặn UPDATE/DELETE, hoa-don.repository.chotThanhToan ghi snapshot, test trigger trong hoa-don-thanh-toan.test.js, có trong docs/cafe_erd.mmd). Chưa có trong đặc tả Word.
- Điểm cần xử lý khi chạm schema: DROP TABLE đầu schema.sql không liệt kê HoaDonDaThanhToan và CREATE TRIGGER không có DROP trước -> db-init chạy lần 2 có thể lỗi (sẽ kiểm tra bằng cách chạy thật).
- Chỗ khuyến mãi sẽ cắm vào (7b): san-pham.repository.menu (thêm gia_sau_giam, ma_khuyen_mai); hoa-don.service taoOrder/themDong (đang gán ma_khuyen_mai=null, giam_gia=0); suaDong (đang tính giam_gia theo tỷ lệ cũ); dinhDang đã có tong_giam_gia. Module khác gọi khuyen-mai qua service.
- Môi trường sandbox: chưa có MariaDB/node_modules; apt cài được mariadb-server, npm registry truy cập được.

## Bước 6c – Khách hàng KH-01..KH-04 + POS-06 (đã làm, đã test) – hoàn tất Sprint 2
- API: POST /api/khach-hang (KH-01, A/Q/N, 201) | GET /api/khach-hang?tu_khoa= (KH-03, A/Q/N, tối đa 20) | PATCH /api/khach-hang/:ma (KH-02, A/Q) | GET /api/khach-hang/:ma/lich-su (KH-04, A/Q) | POST /api/hoa-don/:ma/khach-hang {so_dien_thoai} (POS-06, A/Q/N). KH-05 để Sprint 4.
- Quyết định (tui tự đặt, dễ đổi): (1) SĐT = đúng 10 chữ số bắt đầu bằng 0 (khớp dữ liệu mẫu; chưa nhận +84); (2) KH-01/KH-02 dùng schema STRICT: gửi diem_tich_luy hoặc trường lạ => 400, không bỏ qua âm thầm; (3) tìm khách không phân biệt dấu/hoa thường (collation), % và _ là ký tự thường; (4) KH-04 đọc từ HoaDonDaThanhToan, lọc tu_ngay/den_ngay theo NGÀY THANH TOÁN (gồm cả hai đầu), sắp mới nhất trước, phân trang mặc định 20/tối đa 100; tong_chi_tieu và tong_so_ban_ghi tính trên toàn bộ kết quả lọc (không chỉ trang hiện tại); phản hồi: data = mảng hóa đơn, kèm khach_hang, tong_chi_tieu; (5) POS-06 chỉ khi order còn mở (đã thanh toán/hủy: 409 HOA_DON_DA_DONG), được đổi khách; điểm cộng lúc thanh toán cho khách đang gắn tại thời điểm đó; chưa có thao tác gỡ khách (đặc tả không yêu cầu).
- Sửa kèm theo: database/schema.sql thêm HoaDonDaThanhToan vào DROP TABLE đầu file. Trước đó `npm run db:init` chạy LẦN 2 báo "Table 'HoaDonDaThanhToan' already exists"; giờ chạy 2 lần liên tiếp đều qua (đã kiểm chứng).
- Bảng HoaDonDaThanhToan (do người dùng thêm, trước đây chưa ghi NOTES): bảng chỉ-thêm, 2 trigger chặn UPDATE/DELETE; chotThanhToan ghi 1 dòng snapshot (tong_tien_hang, tong_giam_gia, tong_tien, diem_cong, thoi_gian_thanh_toan) cùng transaction thanh toán. Từ nay KH-04 (và KM-07 ở 7b) đọc từ đây.
- Test: tests/khach-hang.test.js (12 test, dữ liệu riêng TEST_KH_*, SĐT dải 0966xxxxxx, sản phẩm TEST_KH_SP không công thức nên không đụng kho). Thêm tests/_tien-ich-snapshot.js (voiKhoaTrigger, xoaSnapshot): dọn snapshot test phải tháo/dựng trigger DELETE, mà các file test chạy SONG SONG nên mọi nơi tháo/dựng hoặc kiểm tra trigger phải giữ chung một khóa GET_LOCK; đã sửa hoa-don-thanh-toan.test.js dùng khóa này (donDep và test trigger). Không đổi mã nguồn backend ngoài 6c.
- Kết quả: nền 92/92 trước khi sửa -> 103/103 sau 6c (92 - 1 vì file stub rỗng khach-hang.test.js từng được đếm là 1 test + 12 test mới); chạy cả bộ khi có scripts/stress-hoa-don.sh vẫn 103/103. Thử ĐỘT BIẾN 2 chỗ (bỏ strict ở KH-02; bỏ cận trên den_ngay ở KH-04): test bắt được 2 test fail; đã khôi phục. Sau test: KhachHang 3, HoaDon 0, SanPham 8, snapshot 0, trigger 2, tồn kho mẫu nguyên vẹn.
- Môi trường sandbox: MariaDB cài bằng apt, nạp bằng npm run db:init. Chưa test trên XAMPP thật của người dùng.
- scripts/make-zip.sh nay lấy tên thư mục tự động (CNPM-main hay cafe_management đều chạy được).
- Đặc tả Word: sửa POS-06, KH-01..KH-04, Phụ lục B (5 API mới); sinh lại bằng: cd docs && node build_doc.js
- Quyết định đã chốt cho 7a/7b (người dùng): MỘT SẢN PHẨM ÁP ĐƯỢC NHIỀU MÃ khuyến mãi cùng lúc (thay cho "một khuyến mãi tốt nhất" ở bản tối giản); các mặc định còn lại giữ nguyên (làm tròn xuống đồng nguyên, mức giảm mỗi ly không vượt giá bán, order đang mở giữ snapshot cũ, KM-07 lọc ngày theo ngày thanh toán). HỆ QUẢ cần chốt ở đầu 7a: ChiTietHoaDon chỉ có MỘT cột ma_khuyen_mai.

## Sửa lỗi sau 6c (6c-fix) – 2 test fail trên máy người dùng (Windows + XAMPP)
- Báo từ máy người dùng: (a) khach-hang.test "POS-06: thanh toán cộng điểm..." trả 500 LOI_HE_THONG; (b) san-pham.test "danh mục..." 4 !== 3.
- (b) LỖI CỦA TEST CỦA TUI: khach-hang.test.js chèn sản phẩm TEST_KH_SP vào danh mục có mã nhỏ nhất ("Cà phê") nên test san-pham (chạy song song) đếm được 4 sản phẩm. Sửa: tạo danh mục RIÊNG TEST_KH_DM cho sản phẩm test, tự dọn. Vi phạm quy ước "mỗi file chỉ đụng dữ liệu của mình" nên tui tự nhận lỗi.
- (a) LỖI THẬT CỦA MÃ NGUỒN (không chỉ test): DEADLOCK MySQL 1213 khi 2 hóa đơn của CÙNG MỘT khách thanh toán đồng thời. Nguyên nhân: HoaDonDaThanhToan có khóa ngoại tới KhachHang => INSERT snapshot giữ khóa CHIA SẺ trên dòng khách, rồi UPDATE cộng điểm xin khóa GHI; hai transaction cùng giữ S rồi cùng chờ X => deadlock, một bên bị rollback và API trả 500. Lỗi có từ khi thêm bảng snapshot (trước 6c); 6c chỉ làm test chạm vào nó. Đặc tả POS-08 vốn quy định thứ tự khóa HoaDon -> KhachHang nhưng mã chưa khóa khách trước.
- Tái hiện chắc chắn: test mới "thanh toán đồng thời 2 hóa đơn của CÙNG một khách" (12 vòng) trước khi sửa FAIL ngay vòng 0 với errno 1213; sau khi sửa qua.
- SỬA: khach-hang.service.khoaKhach + repository.khoa (SELECT ... FOR UPDATE); hoa-don.service.thanhToan khóa khách TRƯỚC khi ghi snapshot. Thứ tự khóa thanh toán: HoaDon -> KhachHang.
- Giả thuyết tui đã thử và LOẠI: tháo/dựng trigger đồng thời không gây 500 (chạy cả bộ 3 lần cùng vòng lặp tháo/dựng trigger, đều qua).
- Kết quả: 104/104 qua; 3 lần sạch + 2 lần có scripts/stress-hoa-don.sh đều qua.
- Lưu ý khi chạy lệnh trong sandbox: pkill -f <tên script> tự giết cả lệnh chứa tên đó; dùng pkill theo PID.

## Bước 7a – Khuyến mãi: tạo, sửa, xóa, gán sản phẩm (KM-01..KM-06) (đã làm, đã test)
- QUYẾT ĐỊNH ĐÃ CHỐT VỚI NGƯỜI DÙNG: (1) một sản phẩm áp được NHIỀU mã khuyến mãi cùng lúc, cộng dồn trên GIÁ GỐC (7b: tổng giảm mỗi ly không vượt giá bán); (2) thêm bảng con ChiTietHoaDonKhuyenMai(ma_chi_tiet, ma_khuyen_mai, muc_giam_moi_ly) lưu mức giảm trên TỪNG LY của từng mã; (3) "lượt sử dụng" chỉ để THỐNG KÊ (= tổng số LY đã áp mã), KHÔNG có giới hạn số lượt.
- ĐỔI SCHEMA/ERD: bỏ cột ChiTietHoaDon.ma_khuyen_mai (cùng index/FK); ChiTietHoaDon.giam_gia = tổng giảm của dòng = so_luong * tổng muc_giam_moi_ly; bảng mới ChiTietHoaDonKhuyenMai (PK (ma_chi_tiet, ma_khuyen_mai), FK ma_chi_tiet ON DELETE CASCADE, FK ma_khuyen_mai RESTRICT, CHECK muc_giam_moi_ly > 0); thêm vào DROP TABLE đầu schema.sql. Đã sửa verify.sql (7 lỗi ERROR kỳ vọng vẫn đúng), docs/cafe_erd.mmd, hoa-don repository/service (bỏ ma_khuyen_mai khỏi INSERT/SELECT; phản hồi hóa đơn không còn trường ma_khuyen_mai; 7b sẽ trả danh sách khuyến mãi theo dòng), hoa-don.test (khẳng định trường cũ đã bỏ). BẮT BUỘC chạy lại: cd backend && npm run db:init (schema đổi, dữ liệu mẫu nạp lại).
- API (chỉ A/Q, nhân viên 403): POST/GET /api/khuyen-mai (KM-01, KM-06) | GET/PATCH/DELETE /api/khuyen-mai/:ma (xem chi tiết – ngoài đặc tả, KM-02, KM-03) | POST /api/khuyen-mai/:ma/san-pham (KM-04) | DELETE /api/khuyen-mai/:ma/san-pham/:ma_san_pham (KM-05).
- Quyết định tui tự đặt (dễ đổi): (a) ngày nhận dạng YYYY-MM-DDTHH:mm[:ss] (có thể kèm múi giờ), KHÔNG nhận chỉ-ngày vì JS hiểu "2026-10-20" là 00:00 UTC, dễ lệch giờ; (b) trang_thai và so_luot_dung suy ra khi đọc (không lưu cột); so_luot_dung đếm LY, bỏ qua order đã hủy; (c) KM-02 kiểm tra quy tắc trên dữ liệu SAU khi gộp với dữ liệu cũ (đổi sang phan_tram mà giữ 50000 -> 400), schema strict (gửi ma_san_pham ở PATCH -> 400, dùng KM-04/05); (d) KM-03 chặn xóa nếu bất kỳ dòng hóa đơn nào từng áp mã (kể cả order đang mở, đã hủy, mã đã hết hạn): 409 KHUYEN_MAI_DA_DUOC_DUNG; vừa kiểm tra ở service vừa có khóa ngoại RESTRICT làm chốt chặn cuối (thử đột biến bỏ kiểm tra service: test vẫn qua vì FK chặn thay, có chủ đích); (e) sản phẩm ngừng bán vẫn gán được; (f) KM-04 dùng INSERT IGNORE nên thêm đồng thời không lỗi; mọi thao tác ghi khóa dòng khuyến mãi FOR UPDATE; (g) KM-01 gửi ma_san_pham sai: 404 và không tạo khuyến mãi (cùng transaction).
- Test: tests/khuyen-mai.test.js (14 test, dữ liệu riêng TEST_KM_*, danh mục TEST_KM_DM; không đụng 3 khuyến mãi mẫu). Đột biến: bỏ kiểm tra sau-gộp (KM-02) -> 1 test fail; đếm cả order hủy -> 1 test fail; đã khôi phục (đối chiếu diff).
- Kết quả: 117/117 qua; 2 lần sạch + 2 lần có scripts/stress-hoa-don.sh. Sau test: dữ liệu mẫu và tồn kho nguyên vẹn. Lưu ý: scripts/stress-hoa-don.sh chỉ tự dọn khi nhận Ctrl+C/TERM đúng cách; nếu bị kill đột ngột sẽ để lại hóa đơn so_thu_tu >= 60000 (dọn: DELETE FROM HoaDon WHERE so_thu_tu >= 60000 AND thoi_gian_tao < NOW() - INTERVAL 1 DAY).
- Chưa làm (7b): khuyến mãi tự áp vào menu/order, tính cộng dồn, giam_gia từng dòng, sửa số lượng tính lại từ khuyến mãi, KM-07; spec A.2 cần viết lại cho cộng dồn.
- Đặc tả Word đã sửa: KM-01..KM-05, ghi chú KM-06/KM-07, mục 4 (ERD mới), Phụ lục B (4 API mới). Sinh lại: cd docs && node build_doc.js

## Bước 7b – Tự áp khuyến mãi vào menu và order + KM-07 (đã làm, đã test) – hoàn tất khuyến mãi Sprint 3
- LUẬT ÁP (người dùng chốt): MỘT SẢN PHẨM ÁP NHIỀU MÃ cùng lúc, CỘNG DỒN trên GIÁ GỐC, tính TRÊN TỪNG LY. Mức giảm mỗi ly của một mã: phan_tram = gia_ban x % / 100, so_tien = gia_tri_giam, làm tròn XUỐNG đồng nguyên; áp theo mã tăng dần; tổng giảm mỗi ly không vượt giá bán (mã cuối bị cắt phần dư; mã không còn gì để giảm thì không ghi). Mức giảm mỗi mã chụp vào ChiTietHoaDonKhuyenMai lúc gọi món; ChiTietHoaDon.giam_gia = số ly x tổng mức giảm mỗi ly.
- Mã: khuyen-mai.service.tinhKhuyenMai (hàm trung tâm, dùng bởi san-pham.service cho menu và hoa-don.service cho order; san-pham <-> khuyen-mai gọi nhau nên khuyen-mai.service nạp san-pham.service muộn bằng hàm). hoa-don.service.ghiDongCoKhuyenMai dùng cho tạo order (POS-02) và thêm món (POS-03). hoa-don.repository.themChiTiet nay ghi từng dòng và trả mã chi tiết theo thứ tự (không dựa vào mã tự tăng liên tiếp).
- API đổi: GET /api/san-pham/menu thêm gia_sau_giam, tong_giam_moi_ly, khuyen_mai[] {ma_khuyen_mai, ten_khuyen_mai, muc_giam_moi_ly}; mọi phản hồi hóa đơn mỗi dòng có khuyen_mai[] (bỏ ma_khuyen_mai cũ). API mới: GET /api/khuyen-mai/:ma/bao-cao?tu_ngay=&den_ngay= (KM-07, A/Q) -> {ma_khuyen_mai, ten_khuyen_mai, tu_ngay, den_ngay, so_hoa_don, so_luong_ban, tong_tien_giam, doanh_thu_sau_giam}.
- KM-07: đọc ChiTietHoaDonKhuyenMai JOIN ChiTietHoaDon JOIN HoaDonDaThanhToan (chỉ hóa đơn ĐÃ THANH TOÁN), lọc theo NGÀY THANH TOÁN (gồm hai đầu). so_luong_ban = số LY có áp mã; tong_tien_giam = tiền giảm do RIÊNG mã đó; doanh_thu_sau_giam = doanh thu các dòng có áp mã SAU toàn bộ giảm. LƯU Ý: khi nhiều mã cộng dồn trên cùng dòng, cộng doanh_thu_sau_giam của các mã sẽ bị tính trùng (ghi trong đặc tả).
- Order đang mở GIỮ mức giảm đã chụp khi khuyến mãi bị sửa/hết hạn; chỉ dòng thêm mới dùng khuyến mãi hiện tại. POS-04 đổi số lượng: giam_gia = số ly mới x tổng muc_giam_moi_ly đã chụp (dòng cũ chưa có snapshot theo mã thì dùng giam_gia / so_luong cũ).
- LỖI THẬT TÌM RA KHI TEST ĐỒNG THỜI (đã sửa): gọi món và xóa khuyến mãi cùng lúc có lúc DEADLOCK (MySQL 1213, API 500). Nguyên nhân: bản đầu của khuyen-mai.repository.layDangHieuLuc dùng JOIN KhuyenMaiSanPham + KhuyenMai với LOCK IN SHARE MODE nên bên gọi món khóa KhuyenMaiSanPham TRƯỚC rồi mới KhuyenMai, còn KM-03 khóa KhuyenMai TRƯỚC rồi cascade sang KhuyenMaiSanPham: hai bên khóa ngược thứ tự. Sửa: làm 2 bước (đọc thường KhuyenMaiSanPham, rồi đọc hiện hành + khóa chia sẻ CHỈ bảng KhuyenMai theo mã tăng dần). QUY ƯỚC KHÓA: mọi thao tác ghi khuyến mãi (KM-02..KM-05) khóa dòng KhuyenMai TRƯỚC; gọi món khóa KhuyenMai (chia sẻ) và không khóa KhuyenMaiSanPham. Lỗi này hiếm (thấy 1 lần trong ~20 lượt chạy), test đồng thời nay chạy 25 vòng; thử khôi phục khóa cũ 4 lượt thì CHƯA bắt được nên test này chỉ là lưới an toàn xác suất, không phải bằng chứng chắc chắn.
- Test: tests/khuyen-mai-ap-dung.test.js (14 test, dữ liệu riêng TEST_AD_*, mỗi test sản phẩm + khuyến mãi riêng); sửa tests/khuyen-mai.test.js (helper taoDongDaDung nay dùng cơ chế tự áp thật thay vì chèn tay). Đột biến đã thử: bỏ khóa chia sẻ (test đồng thời fail 3/3), bỏ giới hạn tổng giảm (fail 3/3), cộng dồn trên giá đã giảm (fail 3/3), KM-07 tính cả order chưa thanh toán (fail 3/3); đột biến "bỏ snapshot khi sửa số lượng" tương đương về kết quả nên không bắt được (kết quả giống nhau khi snapshot nhất quán).
- Kết quả: 131/131 qua (3 lần sạch; 2 lần có scripts/stress-hoa-don.sh, 1 lần fail đồng thời -> là deadlock nói trên, đã sửa rồi chạy lại: vòng lặp 12 lần dưới stress đều qua). Dữ liệu mẫu và tồn kho nguyên vẹn sau test.
- Việc chưa làm của Sprint 3: module KHO (KHO-01..KHO-06) vẫn chưa làm; frontend toàn bộ vẫn là stub.
- Đặc tả Word đã sửa: POS-01/02/03/04/11, KM-07, A.2 (viết lại cho cộng dồn), Phụ lục B. Sinh lại: cd docs && node build_doc.js

## 7b-fix: test KM-06 phân trang
- Lỗi (máy người dùng): `khuyen-mai.test.js` KM-06 phân trang so 2 trang liên tiếp của TOÀN BỘ bảng KhuyenMai; file test khác chạy song song thêm/xóa khuyến mãi giữa 2 request nên dòng đầu 2 trang trùng nhau.
- Sửa (chỉ test, không đổi mã nguồn): phân trang trên tập riêng (sản phẩm mới + 3 khuyến mãi của test, lọc `ma_san_pham`), kiểm tra tổng = 3, trang 4 rỗng, thứ tự mới nhất trước.

## 7b-fix2: deadlock / 500 ngẫu nhiên khi chạy test nhiều lần
- Triệu chứng (máy người dùng, chạy lặp): 500 ở POS-06 (thanh toán), KH-04 (GET lịch sử), `taoKm` trong test đồng thời của khuyen-mai-ap-dung; không tái hiện khi chạy 15 lần liên tiếp bình thường.
- Tái hiện: tiến trình `scripts/gay-nhieu-ddl.js` liên tục tháo/dựng trigger của HoaDonDaThanhToan (đúng thao tác `xoaSnapshot` của test khác) chạy song song với test -> `ER_LOCK_DEADLOCK 1213` ở `INSERT INTO HoaDonDaThanhToan ... SELECT` (khi thanh toán). Bỏ cơ chế thử lại -> 1–3 test đỏ mỗi lần chạy (6/6 lần); có cơ chế thử lại -> 0 lỗi (6/6 lần).
- Sửa mã nguồn:
  1. `hoa-don.repository.chotThanhToan`: đọc tổng bằng SELECT thường rồi `INSERT ... VALUES` (INSERT ... SELECT đặt khóa chia sẻ next-key lên HoaDon/ChiTietHoaDon -> dễ deadlock).
  2. `utils/transaction.withTransaction`: gặp 1213 (deadlock) hoặc 1412 (bảng đổi định nghĩa giữa chừng) thì ROLLBACK rồi chạy lại cả giao dịch, tối đa 8 lần, nghỉ tăng dần (20·lần + ngẫu nhiên 0–60ms); lỗi khác ném ngay. Giữ nguyên khóa tên (GET_LOCK) giữa các lần thử.
  3. `config/db.js`: `pool.query` (câu lệnh đơn, autocommit) cũng thử lại với 1213/1412 (`utils/loi-thu-lai.js`).
- Công cụ: `scripts/lap-test.js` (lặp N lần, gom lỗi vào mảng, kiểm tra mảng ở cuối; tùy chọn `--ddl`, `--tai`), `scripts/gay-nhieu-ddl.js`. Kết quả ghi vào `logs/lap-test-*.json`.
- Lưu ý: tests không nên chạy `pkill -f` theo tên script khi đang trong cùng shell.
- Kết quả cuối (sandbox, có nhiễu DDL): 150 lần × 4 file (khach-hang, khuyen-mai-ap-dung, khuyen-mai, hoa-don-thanh-toan) → mảng lỗi rỗng (trước khi tăng số lần thử lại: 2 deadlock/120 lần). Chạy 1000 lần: `cd backend && node ../scripts/lap-test.js --lan 1000 --ddl` (khoảng 2–3 giờ cho cả bộ test).

## Bước 8a: module Kho – KHO-01 nguyên liệu, KHO-02 nhà cung cấp, KHO-06 tồn kho
(8b sẽ làm KHO-03 công thức, KHO-04 lập phiếu nhập, KHO-05 lịch sử nhập.)
- Routes (`/api/kho`, toàn bộ A/Q, nhân viên 403): `POST|GET /nguyen-lieu`, `GET|PATCH|DELETE /nguyen-lieu/:ma`, `POST|GET /nha-cung-cap`, `GET|PATCH|DELETE /nha-cung-cap/:ma`, `GET /ton-kho?chi_sap_het=&tu_khoa=`. Gắn trong `src/routes.js`.
- Quyết định (mặc định, có thể đổi):
  1. `so_luong_ton` khởi tạo 0, KHÔNG sửa tay (schema strict: gửi trường này/trường lạ -> 400). `muc_ton_toi_thieu` tùy chọn, mặc định 0.
  2. Tên nguyên liệu không trùng, không phân biệt hoa thường (409 `TRUNG_TEN_NGUYEN_LIEU`, dựa UNIQUE + errno 1062 nên an toàn khi đồng thời).
  3. Đổi `don_vi_tinh` bị chặn (409 `KHONG_DOI_DON_VI`) khi còn tồn hoặc đã nằm trong công thức/phiếu nhập – đổi đơn vị sẽ làm sai nghĩa mọi số liệu cũ.
  4. Xóa nguyên liệu: chặn nếu có trong CongThuc/ChiTietNhap (409 `NGUYEN_LIEU_DANG_DUNG`, `chi_tiet {cong_thuc, phieu_nhap}`); xóa NCC: chặn nếu có PhieuNhap (409 `NCC_DA_CO_PHIEU_NHAP`). Khóa FK (errno 1451) là chốt chặn cuối.
  5. Tên NCC không bắt buộc duy nhất (schema không có UNIQUE). SĐT NCC 10–11 chữ số bắt đầu bằng 0 (khớp dữ liệu mẫu, có số bàn); `null` để xóa SĐT/địa chỉ.
  6. KHO-06 không phân trang (cần thấy đủ cảnh báo); `sap_het = so_luong_ton <= muc_ton_toi_thieu` (cùng quy tắc `canh_bao_kho` khi bán hàng); sắp hết lên đầu.
- Khóa: sửa/xóa nguyên liệu và sửa/xóa NCC đều khóa dòng (FOR UPDATE) trước, rồi mới kiểm tra "đang dùng" bằng SELECT thường. Quy ước cho 8b: đặt công thức khóa các nguyên liệu (theo mã tăng dần) trước; lập phiếu nhập khóa dòng NCC rồi các nguyên liệu (mã tăng dần) – cùng thứ tự với `truKho`.
- Test: `tests/kho-quan-tri.test.js` (15 test, tiền tố riêng `TEST_NL_*`/`TEST_NCC_*`; KHÔNG dùng `TEST_KHO_` vì `kho.test.js` tự dọn theo tiền tố đó). Gồm đồng thời: tạo trùng tên x6 (8 vòng), xóa cùng nguyên liệu x5, xóa NCC lúc lập phiếu. Tổng bộ test: 146/146; `lap-test.js` 40 lần (kho-quan-tri, kho, hoa-don) 0 lỗi.
- Mutation đã thử (test đều phát hiện): bỏ kiểm tra phiếu nhập khi xóa; bỏ chặn đổi đơn vị khi còn tồn; `<=` -> `<` ở sap_het; bỏ khóa dòng ở xóa nguyên liệu. Bỏ `.strict` ban đầu sống sót -> bổ sung ca "trường hợp lệ + so_luong_ton". Bỏ kiểm tra `nccDaCoPhieuNhap` là tương đương (FK chặn, cùng mã 409).
- Tài liệu: build_doc.js (KHO-01/02/06, Phụ lục B) đã cập nhật và sinh lại .docx.

## Bước 8b: module Kho – KHO-03 công thức, KHO-04 lập phiếu nhập, KHO-05 lịch sử nhập
- Routes (`/api/kho`, A/Q): `GET|PUT /cong-thuc/:ma` (ma = ma_san_pham), `POST|GET /phieu-nhap`, `GET /phieu-nhap/:ma`.
- Quyết định (mặc định, có thể đổi):
  1. KHO-03 là PUT thay TOÀN BỘ công thức; mảng rỗng = xóa công thức (sản phẩm không công thức thì không bị giới hạn theo kho). `dinh_luong` > 0, ≤ 3 số lẻ, không lặp nguyên liệu, tối đa 50 dòng. Có thêm GET xem công thức.
  2. Công thức đổi khi order đang mở: kho đã trừ theo công thức CŨ, nếu hủy/bỏ ly sau đó sẽ trả theo công thức MỚI (hệ thống không chụp công thức theo dòng). Chấp nhận như giới hạn đã biết; muốn chính xác tuyệt đối cần thêm bảng snapshot.
  3. KHO-04: `ngay_nhap` tùy chọn (mặc định NOW(); không nhận chỉ-ngày; không quá 5 phút ở tương lai); `so_luong_nhap` và `don_gia_nhap` phải > 0 (theo đặc tả, dù CSDL cho giá = 0); không lặp nguyên liệu trong một phiếu (khóa chính (phiếu, nguyên liệu)); 1–100 dòng.
  4. Tiền: thành tiền từng dòng làm tròn nửa lên đến 0,01 rồi cộng (BigInt, không lỗi số thực); tổng tối đa theo DECIMAL(14,2). Tồn sau nhập vượt DECIMAL(14,3): 409 `TON_KHO_VUOT_GIOI_HAN`.
  5. KHO-05: `tu_ngay/den_ngay` lọc theo NGÀY nhập (den_ngay trọn ngày), mới nhất trước, `tong_tien_nhap` + `tong_so_ban_ghi` trên toàn bộ kết quả lọc (như KH-04). Thêm chi tiết một phiếu với `thanh_tien`.
- Khóa: đặt công thức = SanPham (FOR UPDATE, qua `sanPhamService.khoaSanPham` mới) -> NguyenLieu (mã tăng dần); lập phiếu = NhaCungCap (LOCK IN SHARE MODE) -> NguyenLieu (mã tăng dần). Tạo order = FK SanPham (chia sẻ) -> truKho khóa NguyenLieu (mã tăng dần) => cùng thứ tự, không chu trình. Xóa NCC khóa NCC FOR UPDATE nên phiếu đang lập chặn xóa (và ngược lại), không có phiếu mồ côi.
- Test: `tests/kho-nhap-hang.test.js` (15 test, tiền tố `TEST_NH_*`). Có đồng thời: 4 bộ công thức khác nhau cho cùng sản phẩm (không trộn), đặt công thức lúc có người gọi món, 6 phiếu chồng chéo thứ tự ngược nhau, nhập lúc bán (tồn cuối = đầu + Σ nhập − Σ trừ), xóa NCC lúc lập phiếu. Tổng bộ test 161/161; `lap-test.js --ddl` 40 lần (5 file kho/hóa đơn/sản phẩm): 0 lỗi.
- Mutation đã thử (đều bị phát hiện): bỏ làm tròn nửa lên; bỏ cộng tồn dòng đầu; bỏ chặn tồn vượt giới hạn; bỏ xóa công thức cũ; bỏ khóa sản phẩm; bỏ `+ INTERVAL 1 DAY`; đổi thứ tự sắp xếp; bỏ kiểm tra lặp nguyên liệu; bỏ khóa NCC chia sẻ. Bỏ sort JS các dòng nhập là mutation tương đương (thứ tự khóa do `ORDER BY ... FOR UPDATE` trong SQL quyết định).
- Lưu ý vận hành sandbox: mysqld trong sandbox thỉnh thoảng tự tắt (ECONNREFUSED hàng loạt); kết quả mutation chạy lúc DB tắt không có giá trị — kiểm tra `mysql -uroot -e "select 1"` trước.
- Docs: build_doc.js (KHO-03/04/05, Phụ lục B) cập nhật và sinh lại .docx.

## Bước 9a: AUTH-02 đổi mật khẩu + NS-01..03 nhân viên/tài khoản
- Routes: `POST /api/auth/doi-mat-khau` (A/Q/N, của chính mình); `/api/nhan-su`: `POST` (A), `GET` danh sách (A/Q, `tu_khoa`, `trang_thai`, `quyen_truy_cap`, phân trang), `GET /:ma` (A/Q), `PATCH /:ma` (A, Q sửa thông tin), `DELETE /:ma` (A). Gắn trong `src/routes.js`.
- Quyết định (mặc định, có thể đổi):
  1. Chính sách mật khẩu (AUTH-02, NS-01, đặt lại ở NS-02): 8–72 byte (giới hạn bcrypt), có ít nhất một chữ cái và một chữ số. Mật khẩu mới phải khác cũ (400 `MAT_KHAU_MOI_TRUNG_CU`); sai mật khẩu cũ: 401 `SAI_MAT_KHAU_CU` (kiểm trước). Không có cột "phiên bản mật khẩu" nên token đã cấp vẫn dùng được đến khi hết hạn (nếu cần vô hiệu hóa token khi đổi mật khẩu: thêm cột `TaiKhoan.mat_khau_doi_luc` và so với `iat`).
  2. Tên đăng nhập: 3–50 ký tự `A-Za-z0-9._-`; UNIQUE không phân biệt hoa thường. Sửa nhân viên KHÔNG đổi tên đăng nhập và không đổi `trang_thai` (nghỉ việc đi qua NS-03).
  3. NS-02: quản lý không đổi quyền, không đặt lại mật khẩu, không sửa tài khoản admin (403, không ghi gì). Admin thêm được `mat_khau` (đặt lại mật khẩu cho người khác – đặc tả không có, tôi bổ sung vì thiếu thì quên mật khẩu phải sửa SQL). Không hạ quyền admin cuối (409 `ADMIN_CUOI_CUNG`). Quyền đổi có hiệu lực ngay (middleware tra lại CSDL mỗi request).
  4. NS-03: chưa có hóa đơn/phiếu nhập/phân công TRƯỚC hôm nay -> xóa hẳn kèm tài khoản và phân công từ hôm nay (`{da_xoa:true}`); có lịch sử -> `nghi_viec` + gỡ phân công từ hôm nay (`{da_xoa:false, trang_thai, ly_do, so_phan_cong_da_go}`), gọi lại vẫn 200. 409: tự xóa mình (`KHONG_XOA_CHINH_MINH`), xóa admin cuối.
  5. Mọi thao tác GHI nhân sự chạy dưới khóa tên `nhan_su` (GET_LOCK, qua `withTransaction({khoa})`) nên nối tiếp nhau: hai admin không thể cùng hạ/xóa nhau để còn 0 admin; không cần lo thứ tự khóa dòng. Băm bcrypt làm NGOÀI transaction.
- Test: `tests/nhan-su.test.js` (18 test, tiền tố `TEST_NS_*`/`tns_*`) và `tests/auth-doi-mat-khau.test.js` (4 test, `TEST_DMK_*`/`tam_dmk_*`). Hai file không tạo/đụng tài khoản mẫu; `auth-doi-mat-khau` KHÔNG tạo tài khoản admin vì `nhan-su.test.js` đếm số admin. Test "hạ quyền admin cuối" chạy trên admin mẫu nhưng có `finally` khôi phục quyền admin bằng SQL.
- BÀI HỌC: lần đầu mutation "bỏ chặn hạ quyền admin cuối" làm test thật sự hạ quyền admin mẫu trong CSDL -> mọi test sau 403. Đã thêm khôi phục tự động. Nếu admin mẫu bị mất quyền: `UPDATE TaiKhoan SET quyen_truy_cap='admin' WHERE ten_dang_nhap='admin';`
- Tổng bộ test 182/182; `lap-test.js` 15 lần (nhan-su, auth-doi-mat-khau, auth, phan-quyen): 0 lỗi. Mutation đã thử (đều bị phát hiện): bỏ chặn Q sửa admin; bỏ chặn Q đổi quyền/mật khẩu; bỏ chặn hạ admin cuối; bỏ chặn tự xóa; bỏ gỡ phân công tương lai; bỏ từng nguồn lịch sử (hóa đơn/phiếu nhập/phân công cũ); đổi `<` thành `<=` ở phân công cũ; bỏ kiểm tra mật khẩu cũ/mới trùng cũ/chính sách chữ+số. Sống sót: bỏ khóa tên `nhan_su` ở NS-01 (UNIQUE + transaction vẫn đúng; khóa chỉ cần cho đếm admin).
- Docs: build_doc.js (AUTH-02, NS-01..03, Phụ lục B) cập nhật và sinh lại .docx.

## Bước 9b – Ca làm việc, xếp lịch, lịch tuần (NS-04..NS-07)
- Route tĩnh `/ca-lam-viec`, `/phan-cong`, `/lich-tuan` đăng ký TRƯỚC `/:ma` trong `nhan-su.routes.js`.
- Quyết định thiết kế: ca không qua nửa đêm (bắt đầu < kết thúc, 400); tên ca được trùng; giờ trả dạng `HH:mm:ss`, ngày `YYYY-MM-DD` (dùng DATE_FORMAT/TIME_FORMAT để tránh lệch múi giờ JS).
- NS-05: một ngày hoặc mảng (1–62), all-or-nothing; chỉ từ hôm nay (theo CURDATE của DB); 409 `DA_XEP_LICH` + `chi_tiet.ngay_da_xep`; 409 `NHAN_VIEN_NGHI_VIEC`. Khóa: NhanVien (share) → CaLamViec (share); NS-03 chạy dưới named lock `nhan_su` + khóa dòng nhân viên nên không còn lịch tương lai của người đã nghỉ.
- NS-04 xóa ca: khóa dòng ca → kiểm tra phân công → FK 1451 là chốt cuối (409 `CA_DA_CO_PHAN_CONG`).
- NS-06: dùng query params, xóa được mọi ngày. NS-07: `tu_ngay` phải là thứ Hai (mặc định thứ Hai tuần này), trả thêm `tu_ngay`/`den_ngay`; role N chỉ xem của mình (xin người khác → 403).
- Query KHÔNG strict (quy ước chung của dự án): tham số thừa bị bỏ qua.
- Test: `tests/nhan-su-lich.test.js` (22 test, tiền tố `TEST_LICH_`). Dữ liệu mẫu (ca 1–3, phân công mẫu) không bị đụng; lịch tuần của test dùng tuần xa và lọc theo nhân viên riêng.
- Mutation đã kiểm: bỏ start<end, bỏ chặn quá khứ, bỏ chặn nghỉ việc, bỏ kiểm tra đã xếp, bỏ giới hạn role N, bỏ 403 người khác, bỏ LOCK IN SHARE MODE, đổi cửa sổ 7→8 ngày, đảo thứ tự giờ → test đều đỏ.
- Tổng: 204 test qua.

## Bước 9c – KH-05 và báo cáo BC-01..BC-06
- KH-05: `GET /api/khach-hang/top` (A/Q), đặt trước các route `/:ma`. Query `tu_ngay`, `den_ngay`, `top` (mặc định 10, 1–100). Đọc `HoaDonDaThanhToan` JOIN `KhachHang`, bỏ khách vãng lai; xếp tổng chi tiêu ↓, số đơn ↓, mã khách ↑. Trả thêm `so_dien_thoai`.
- Module `bao-cao` (mount `/api/bao-cao`, chỉ A/Q, chỉ ĐỌC): `/doanh-thu` (BC-01), `/san-pham-ban-chay` (BC-02), `/doanh-thu-theo-danh-muc` (BC-03), `/phuong-thuc-thanh-toan` (BC-04), `/chi-phi-vs-doanh-thu` (BC-05), `/doanh-thu-theo-nhan-vien` (BC-06).
- Quy ước chung: nguồn doanh thu là `HoaDonDaThanhToan` (snapshot bất biến), lọc theo NGÀY THANH TOÁN, `tu_ngay`/`den_ngay` gồm cả hai đầu (`< den_ngay + 1 DAY`), cùng quy ước với KH-04 và KM-07. Hóa đơn chưa thanh toán/hủy không có snapshot nên không bao giờ lọt vào báo cáo. Helper chung: `src/utils/loc-ngay.js`.
- Kỳ (`nhom`): ngày `YYYY-MM-DD`; tuần = ngày thứ Hai đầu tuần; tháng `YYYY-MM`. Chỉ trả kỳ có dữ liệu (không điền kỳ 0). BC-05 hợp nhất hai phía theo kỳ nên kỳ chỉ có nhập hàng hoặc chỉ có bán hàng đều xuất hiện; `chenh_lech` có thể âm.
- Doanh thu theo sản phẩm/danh mục tính từ dòng: `so_luong*don_gia - giam_gia`; tổng BC-03 khớp tổng BC-01 (test kiểm chứng). `ty_le` làm tròn 2 chữ số.
- Ghi chú kiến trúc: repository `bao-cao` đọc trực tiếp các bảng của module khác (chỉ SELECT) — chấp nhận cho báo cáo vì không thể ghép qua service mà vẫn gom được bằng SQL.
- Test: `tests/bao-cao.test.js` (19 test). Dữ liệu cô lập trong cửa sổ ngày năm 2031 + tiền tố `TEST_BCAO_`; hóa đơn chèn thẳng bằng SQL kèm snapshot, dọn bằng `xoaSnapshot`. Mutation đã kiểm: biên ngày (cả hai đầu), tuần, doanh thu dòng, thứ tự đồng hạng (BC-02, KH-05), tỷ lệ, hợp nhất BC-05, dấu chênh lệch, role A/Q, top mặc định → đều có test đỏ.
- Tổng: 222 test qua.

## Rà soát backend cuối (sau 9c)
- Toàn bộ bộ test: 222/222. `lap-test --ddl` lặp nhiều lần: 0 lỗi (xem log trong `logs/`).
- Backend đã đủ: AUTH-01..02, SP, KH-01..05, KM-01..07, POS, KHO-01..06, NS-01..07, BC-01..06. Frontend vẫn là stub.

## Đặc tả yêu cầu chức năng có sơ đồ vào/ra (đã làm)
- Yêu cầu: viết đặc tả cho MỌI chức năng, mỗi chức năng có sơ đồ theo bố cục hình phác thảo (thiết bị vào / dữ liệu vào / dữ liệu độc lập từ CSDL -> Xử lý -> thiết bị ra / dữ liệu ra / dữ liệu lưu xuống CSDL; dòng "Xử lý: công thức tính toán, so sánh điều kiện"); bảng đặc tả theo dạng form (Chương 4 Requirements Engineering).
- Kết quả: docs/Dac_ta_yeu_cau_chuc_nang.docx (A4 ngang, 113 trang, 49 chức năng: AUTH 2, SP 5, POS 11, KM 7, KH 5, KHO 6, NS 7, BC 6). Mỗi chức năng 2 trang: trang 1 = tiêu đề + sơ đồ; trang 2 = bảng đặc tả (đầu vào, dữ liệu độc lập, xử lý đánh số ID.n, đầu ra, dữ liệu lưu, tiền/hậu điều kiện, tác dụng phụ, mã lỗi). Có phụ lục truy vết chức năng <-> bảng CSDL (tự sinh).
- Cấu trúc thư mục mới (docs/srs/): du_lieu/00_meta.json + 01..08_*.json (NGUỒN dữ liệu từng chức năng, sửa ở đây), ve_so_do.py (vẽ so_do/*.png), build_srs.js (dựng Word), so_do/ (49 ảnh + _mau.png).
- Chạy lại: cd docs/srs && python3 ve_so_do.py && node build_srs.js   (cần: pip install matplotlib pillow; npm i docx)
- Cách hiểu hình phác thảo (tui tự đặt, dễ đổi): "dl độc lập" = dữ liệu có sẵn trong CSDL mà chức năng đọc; "dl ... xuống" = dữ liệu lưu xuống CSDL. Thiết bị vào/ra mặc định: bàn phím/chuột và màn hình trình duyệt (POS-11 thêm máy in hóa đơn) vì frontend còn là stub.
- Nội dung lấy từ docs/build_doc.js (đặc tả cũ), schema.sql, routes và NOTES; chưa sửa mã nguồn backend. Dữ liệu ghi tay trong du_lieu/*.json nên nếu đổi hành vi API phải sửa cả JSON.
- Đã kiểm tra: validate.py của docx qua; render PDF bằng LibreOffice, xem lại các trang đầu và mẫu từng nhóm. Chưa đọc lại từng chữ của 49 chức năng với mã nguồn (dựa vào đặc tả cũ đã được test).


## Bước 4 – Giao diện web cho quản lý + admin, đợt 1 (đã làm; build + test giao diện bằng dữ liệu giả; CHƯA chạy với backend/MySQL thật)
- Bản mẫu giao diện người dùng đã duyệt nằm ở docs/mockup/ (canvas.json + các file .dc.html: đăng nhập, sản phẩm, tồn kho, báo cáo, menu).
- Chạy: terminal 1 `cd backend && npm start`; terminal 2 `cd frontend && npm install && npm run dev` rồi mở http://localhost:5173 (Vite chuyển /api sang http://localhost:3000, không cần .env). Đăng nhập: quanly/Quanly@123 hoặc admin/Admin@123.
- Đợt 1 gồm: nền tảng (Vite, React Router, lớp gọi API có Authorization + xử lý 401, AuthContext khôi phục phiên qua /auth/toi, chặn route theo quyền), khung menu theo quyền (admin thấy thêm "Tài khoản và quyền"; dùng được trên điện thoại), AUTH-01 đăng nhập, AUTH-02 đổi mật khẩu (hộp thoại từ menu), SP-01 quản lý danh mục, SP-02..05 thêm/sửa/ngừng bán/xóa/danh sách có lọc + phân trang, và xem/sửa công thức từng sản phẩm (KHO-03).
- Các màn còn lại (Khuyến mãi, Tồn kho, Nhập hàng, Khách hàng, Lịch làm việc, Nhân viên, Tài khoản, Báo cáo) đang là trang giữ chỗ ChuaLam; nhân viên đăng nhập sẽ thấy trang "chưa có giao diện" (giao diện bán hàng làm sau).
- Cấu trúc frontend/src: api/ (http.js + một file mỗi module), context/AuthContext.jsx, hooks/useApi.js, routes/{AppRoutes,RequireRole}.jsx, layouts/{MainLayout,AuthLayout}.jsx, components/{Dialog,ConfirmDialog,Toast,DataTable,Pagination,Icon}.jsx, pages/{auth,san-pham,chung}/, styles/index.css (token màu lấy từ bản mẫu), utils/{format,loi}.js.
- Quyết định: (1) cột Khuyến mãi và Công thức của bảng sản phẩm ghép từ GET /san-pham/menu vì API danh sách quản trị không trả hai thông tin này; sản phẩm ngừng bán không có trong menu nên hiện "Không có"/"—". (2) Chip khuyến mãi hiện tên khuyến mãi (API chỉ trả mức giảm theo đồng mỗi ly, hiện trong chú thích khi rê chuột), không hiện "%" như bản mẫu. (3) Nút Xóa luôn bật; sản phẩm đã bán thì backend trả 409 và giao diện hiện đúng thông báo (không đoán trước được). (4) Cột "Danh mục" gộp vào dưới tên sản phẩm cho vừa chiều rộng.
- Kiểm tra: `cd frontend && npm run build` qua. frontend/scripts/smoke-ui.mjs chặn /api bằng dữ liệu giả từ seed.sql, kiểm tra đăng nhập sai/đúng, bảng 8 sản phẩm, ẩn mục chỉ-admin, panel sửa, tìm kiếm, không có lỗi console, và chụp ảnh vào frontend/scripts/anh-smoke/. Chạy lại: `cd frontend && npm run build && npx vite preview --port 4173 &` rồi `node scripts/smoke-ui.mjs` (cần `npm i -D playwright`; sandbox dùng chromium có sẵn).
- Giới hạn đã biết: chưa thử với backend/MySQL thật (sandbox hiện không có MariaDB); token lưu localStorage (đơn giản, chấp nhận cho đồ án).


## Bước 5 – Giao diện web đợt 2: cụm Kho (đã làm; build + test giao diện bằng dữ liệu giả; CHƯA chạy với backend/MySQL thật)
- Menu "Tồn kho" mở /kho; menu "Nhập hàng" mở /kho/lich-su-nhap. Cả hai cùng một trang có 4 tab: Tồn kho (/kho), Nguyên liệu (/kho/nguyen-lieu), Lịch sử nhập (/kho/lich-su-nhap), Nhà cung cấp (/kho/nha-cung-cap). /nhap-hang tự chuyển sang /kho/lich-su-nhap.
- KHO-06 tab Tồn kho: bảng có thanh mức tồn (vạch đen = mức tối thiểu; thang đo = max(6 x tối thiểu, tồn)), lọc "Chỉ hiện sắp hết", cảnh báo vàng trên đầu (tính trên toàn kho, không đổi theo bộ lọc), nút "Lập phiếu nhập" ở cảnh báo điền sẵn các nguyên liệu sắp hết vào phiếu.
- KHO-04 lập phiếu nhập (pages/kho/PhieuNhapForm.jsx): chọn nhà cung cấp, ngày giờ (để trống = bây giờ), nhiều dòng nguyên liệu (số lượng, đơn giá), tổng tiền tính ngay; kiểm tra trước ở client theo đúng quy tắc backend (không lặp nguyên liệu, số lượng > 0 tối đa 3 số lẻ, đơn giá > 0 tối đa 2 số lẻ, không ở tương lai). Hiện ở panel bên phải tab Tồn kho và trong hộp thoại ở tab Lịch sử nhập.
- KHO-05 lịch sử nhập: lọc từ ngày, đến ngày, nhà cung cấp; hiện "Tổng tiền nhập (theo bộ lọc)" lấy từ tong_tien_nhap của API (tính trên toàn bộ kết quả lọc, không chỉ trang hiện tại); bấm một phiếu để xem chi tiết từng dòng.
- KHO-01 nguyên liệu và KHO-02 nhà cung cấp: danh sách có tìm kiếm + phân trang + panel thêm/sửa/xóa. Không có ô sửa số tồn (backend cấm; tồn chỉ đổi qua nhập hàng và bán hàng). Lỗi 409 (đổi đơn vị khi còn tồn, xóa nguyên liệu đã dùng, xóa nhà cung cấp đã có phiếu) hiển thị đúng thông báo của backend.
- Công thức (KHO-03) vẫn sửa trong panel của màn Sản phẩm (người dùng đã duyệt, không thêm mục menu riêng).
- File mới: api/kho.api.js, components/Truong.jsx, pages/kho/{index,TonKhoTab,NguyenLieuTab,NccTab,LichSuNhapTab,PhieuNhapForm}.jsx. Sửa: MainLayout (mục menu có hàm khop để tô sáng đúng), AppRoutes, Icon, DataTable, styles/index.css.
- Kiểm tra: `npm run build` qua; frontend/scripts/smoke-ui.mjs mở rộng thêm 9 kiểm tra cho Kho (cảnh báo, thứ tự bảng, điền sẵn phiếu, tổng tiền, nội dung gửi lên đúng, báo lỗi phiếu trống, chi tiết phiếu), tổng 16/16 qua, không có lỗi console. Ảnh mới: anh-smoke/4-ton-kho.png, 5-nguyen-lieu.png, 6-lich-su-nhap.png.
- Giới hạn đã biết: danh sách nhà cung cấp và nguyên liệu trong form phiếu nhập lấy tối đa 100 dòng đầu (giới hạn moi_trang của API); ô ngày giờ dùng định dạng theo ngôn ngữ trình duyệt.


## Bước 6 – Giao diện web đợt 3: Khuyến mãi (đã làm; build + test giao diện bằng dữ liệu giả; CHƯA chạy với backend/MySQL thật)
- Menu "Khuyến mãi" -> /khuyen-mai (pages/khuyen-mai/{index,KhuyenMaiPanel,SanPhamApDung,HieuQua}.jsx, api/khuyen-mai.api.js). Bản mẫu chưa có màn này, dựng theo cùng khung bảng + panel đã duyệt.
- KM-06 danh sách: lọc theo trạng thái (đang chạy / sắp diễn ra / hết hạn) và theo sản phẩm; cột mức giảm (% hoặc đồng), thời gian, số sản phẩm, số ly đã giảm; dòng hết hạn làm mờ.
- KM-01/02 thêm/sửa trong panel: tên, loại giảm, mức giảm, bắt đầu, kết thúc; kiểm tra trước ở client (phần trăm <= 100, bắt đầu < kết thúc). Thêm mới có thể tick sản phẩm áp dụng ngay (ma_san_pham[]).
- KM-04/05 sản phẩm áp dụng: ô chọn + nút Thêm, nút × để gỡ; sản phẩm ngừng bán vẫn gán được (có ghi chú).
- KM-07 hiệu quả: số hóa đơn, số ly áp mã, tiền đã giảm (riêng mã này), doanh thu sau giảm; lọc theo ngày thanh toán, chỉ tính hóa đơn đã thanh toán.
- KM-03 xóa: nếu khuyến mãi đã áp vào hóa đơn, backend trả 409 KHUYEN_MAI_DA_DUOC_DUNG; giao diện hiện thông báo kèm nút "Ngừng áp dụng ngay" (đặt ngay_ket_thuc về hiện tại, đúng gợi ý của backend).
- Quyết định: ngày giờ gửi lên backend ở dạng ISO có múi giờ (toISOString) nên không lệch giờ dù trình duyệt và máy chủ khác múi giờ; hiển thị theo giờ máy người dùng. Thêm utils/format.js: sangOGioNhap, tuOGioNhap, ngayGioNgan. Panel dài nên có max-height + cuộn riêng (cũng áp cho panel Sản phẩm, Kho).
- Kiểm tra: build qua; smoke-ui.mjs thêm 7 kiểm tra Khuyến mãi (3 dòng, chip Hết hạn, sản phẩm áp dụng, hiệu quả, lỗi 409 + nút ngừng áp dụng, tạo trống báo lỗi, nội dung gửi lên), tổng 24/24 qua, chạy lặp 3 lần ổn định. Ảnh: anh-smoke/7-khuyen-mai.png. Đã sửa 2 chỗ test chạy không ổn định (chờ phản hồi giả, chờ danh sách nguyên liệu tải xong).
- Giới hạn đã biết: ô chọn sản phẩm lấy tối đa 100 sản phẩm đầu (giới hạn moi_trang của API).


## Bước 7 – Giao diện web đợt 4: Khách hàng KH-01..KH-05 (đã làm; build + test giao diện bằng dữ liệu giả; CHƯA chạy với backend/MySQL thật)
- Menu "Khách hàng" -> /khach-hang (tab "Tra cứu") và /khach-hang/than-thiet (tab "Khách thân thiết"). File mới: api/khach-hang.api.js, pages/khach-hang/{index,TraCuuTab,KhachPanel,LichSuMua,ThanThietTab}.jsx. Sửa: AppRoutes (route /khach-hang/:tab?), utils/format.js (PHUONG_THUC, homNay), styles/index.css (ô ngày trong .cong-thuc-dong bị bóp 92px -> sửa, cũng sửa luôn ô ngày ở panel Khuyến mãi KM-07).
- KH-03 tìm: API bắt buộc có tu_khoa và chỉ trả tối đa 20 khách (không có API "liệt kê tất cả"), nên chưa gõ gì thì hiện hướng dẫn; gõ có debounce 300 ms; đủ 20 kết quả thì có chú thích "chỉ hiện 20 khách đầu". Không tìm thấy -> gợi ý "Thêm khách hàng", nếu từ khóa toàn số (>= 6 chữ số) thì điền sẵn vào ô SĐT.
- KH-01 thêm / KH-02 sửa: cùng một panel (tên, SĐT). Kiểm tra trước ở client theo backend (tên 1–100 ký tự; SĐT đúng 10 chữ số bắt đầu bằng 0). 409 TRUNG_SDT hiện ngay ở ô SĐT. Điểm tích lũy chỉ xem (backend cấm sửa); khi sửa chỉ gửi ten_khach_hang và so_dien_thoai. Lưu xong panel giữ khách vừa lưu dù không còn khớp từ khóa.
- KH-04 lịch sử mua nằm trong panel: lọc từ ngày/đến ngày (theo ngày thanh toán), 5 hóa đơn/trang, "Số đơn" và "Tổng chi tiêu" lấy từ API (tính trên toàn bộ kết quả lọc).
- KH-05 tab Khách thân thiết: lọc từ/đến ngày + Top 5/10/20/50 (mặc định 10); bảng hạng, tên, SĐT, số đơn, tổng chi tiêu.
- Kiểm tra: `npm run build` qua; frontend/scripts/smoke-ui.mjs thêm 8 kiểm tra Khách hàng, tổng 32/32 qua (chạy 3 lần ổn định), không lỗi console. Ảnh: anh-smoke/8-khach-hang.png, 9-khach-than-thiet.png. Chạy lại: xem hướng dẫn ở "Bước 4" (cần playwright; chromium của sandbox).
- Giới hạn đã biết: chưa thử với backend/MySQL thật; không có danh sách toàn bộ khách (vì API chưa có).


## Bước 8 – Giao diện web đợt 5: Nhân sự (đã làm; build + test giao diện bằng dữ liệu giả; CHƯA chạy với backend/MySQL thật)
- Ba màn, thay ChuaLam: /nhan-vien (NS-01..03), /tai-khoan (chỉ admin; NS-02 đổi quyền + đặt lại mật khẩu), /lich-lam-viec (tab "Lịch tuần" NS-05..07 và tab "Ca làm việc" NS-04, đường dẫn /lich-lam-viec/ca). File mới: api/nhan-su.api.js, pages/nhan-su/{NhanVien,NhanVienPanel,TaiKhoan,LichLamViec,LichTuan,XepLichDialog,CaLamViecTab}.jsx (index.jsx chỉ re-export). Sửa: AppRoutes, utils/format.js (TEN_QUYEN, THU_NGAN, gioNgan, congNgay, thuHaiCua, ngayNganGon), styles/index.css (lưới lịch tuần).
- Nhân viên: tìm (tên/SĐT/tên đăng nhập, debounce 300 ms), lọc trạng thái + quyền, phân trang 10. "Thêm nhân viên" CHỈ admin (tạo kèm tài khoản: tên đăng nhập, mật khẩu ban đầu, quyền). Quản lý chỉ sửa họ tên/chức vụ/SĐT; chọn dòng admin thì form bị khóa kèm thông báo (backend vẫn trả 403 nếu gọi tay). Xóa (chỉ admin): một nút "Xóa hoặc cho nghỉ việc", hộp xác nhận giải thích hai kết quả; toast khác nhau theo da_xoa; không hiện nút với chính mình và với người đã nghỉ. Mật khẩu kiểm trước ở client: 8–72 ký tự, có chữ cái và chữ số (khớp backend). 409 TRUNG_TEN_DANG_NHAP hiện ở ô tên đăng nhập.
- Tài khoản và quyền: bảng + khối mô tả 3 quyền; panel có hai form riêng (Lưu quyền / Đặt lại mật khẩu), mỗi form chỉ gửi đúng một trường; cảnh báo khi hạ quyền chính mình; 409 ADMIN_CUOI_CUNG hiển thị đúng thông báo backend. Nhân viên chưa có tài khoản hiện "Chưa có tài khoản" và không chọn được.
- Lịch tuần: lưới hàng = ca, cột = 7 ngày (thứ Hai–Chủ nhật), cột hôm nay tô nhạt; tên nhân viên là thẻ có nút × (NS-06, có hộp xác nhận); dấu + trong ô (từ hôm nay) hoặc nút "Xếp lịch" mở hộp NS-05: chọn nhân viên đang làm, ca, các ngày trong tuần đang xem, lặp lại 1–8 tuần liên tiếp -> gửi mảng ngay_lam (tối đa 56 ngày, dưới giới hạn 62; ngày đã qua bị bỏ). Chuyển tuần ‹ ›, "Tuần này", lọc theo nhân viên. tu_ngay luôn là thứ Hai tính theo giờ máy người dùng.
- Ca làm việc: bảng + panel thêm/sửa/xóa; kiểm tra giờ bắt đầu < giờ kết thúc ở client; 409 CA_DA_CO_PHAN_CONG hiện đúng thông báo.
- Kiểm tra: build qua; smoke-ui.mjs thêm 25 kiểm tra Nhân sự (đổi vai quản lý -> admin ngay trong bài test), tổng 57/57 qua, chạy lặp nhiều lần ổn định. Ảnh: anh-smoke/10-nhan-vien.png, 11-tai-khoan.png, 12-xep-lich.png, 13-lich-tuan.png.
- Lưu ý khi đọc dự án: có file lạ tên `8` (nội dung "M8 window 7-") trong backend/src/modules/nhan-su/ — không phải mã, nên xóa tay (chưa đụng tới).
- Giới hạn đã biết: danh sách nhân viên trong hộp xếp lịch và bộ lọc lấy tối đa 100 người đầu; chưa thử với backend/MySQL thật; role nhan_vien vẫn chưa có giao diện xem lịch của mình (làm cùng giao diện bán hàng sau).


## Bước 9 – Giao diện web đợt 6: Báo cáo BC-01..BC-06 (đã làm; build + test giao diện bằng dữ liệu giả; CHƯA chạy với backend/MySQL thật) – hết giao diện quản lý/admin
- Đã xóa file lạ `backend/src/modules/nhan-su/8` theo yêu cầu. Giờ không còn route nào dùng ChuaLam (file pages/chung/ChuaLam.jsx còn nằm đó, không dùng).
- Màn /bao-cao có 6 tab đúng bản mẫu docs/mockup/BaoCao.dc.html: Doanh thu (/bao-cao), Sản phẩm bán chạy, Theo danh mục, Phương thức thanh toán, Chi phí nhập và doanh thu, Theo nhân viên (/bao-cao/<san-pham|danh-muc|thanh-toan|chi-phi|nhan-vien>). Một hàng bộ lọc chung phía trên (từ ngày, đến ngày mặc định từ đầu tháng đến hôm nay; "Gom theo" ngày/tuần/tháng cho BC-01 và BC-05; "Hiển thị Top N" cho BC-02), bấm "Xem báo cáo" mới tải lại; đổi tab giữ nguyên bộ lọc. Từ ngày sau đến ngày: báo lỗi và khóa nút. Để trống ngày = không giới hạn.
- BC-01: dải 3 số liệu (doanh thu, số đơn, trung bình mỗi đơn) + biểu đồ cột + khung "Bán chạy nhất" (BC-02 top 5 cùng khoảng ngày) với liên kết sang tab sản phẩm. Kỳ không có hóa đơn được điền 0 ở phía giao diện (API chỉ trả kỳ có dữ liệu) khi khoảng ngày đủ hai đầu và <= 120 kỳ; kỳ hiện tại (hôm nay / tuần này / tháng này) vẽ cột nhạt kèm chú giải "chưa hết". Nút Biểu đồ/Bảng như bản mẫu.
- BC-02/03/04/06: thanh ngang xếp hạng (giá trị ở đầu thanh), dải số liệu riêng từng báo cáo, bảng thay thế. BC-03 hiện cả tỷ lệ %, BC-04 tính % phía giao diện từ tổng tiền. BC-05: cột ghép đôi doanh thu và chi phí nhập trên CÙNG MỘT trục (không dùng hai trục), chênh lệch (có thể âm, hiện dấu −) ở dải số liệu, bảng và chú giải rê chuột.
- Biểu đồ vẽ bằng SVG/HTML thuần, không thêm thư viện (components/BieuDo.jsx: CotChart, ThanhNgang, TheBieuDo, BangSo, ChiSo, useTip). Theo quy tắc dataviz: cột <= 24px, đầu bo 4px, lưới mảnh, nhãn thưa (chỉ nhãn đỉnh), hover/focus có chú giải, mọi giá trị đều có ở dạng Bảng. SVG giữ bề rộng tối thiểu 560px và cuộn ngang trong thẻ trên điện thoại (trang không cuộn ngang).
- Màu: một chuỗi dùng màu thương hiệu #1B6B63 như bản mẫu. BC-05 cần 2 chuỗi: chạy validate_palette (skill dataviz) thấy teal #1B6B63 bị "chroma floor" (đọc như xám) nên dùng #0E9080 (doanh thu) và #C9861A (chi phí nhập): đạt dải sáng, chroma, CVD (ΔE 12.1), nhìn thường (ΔE 21.4); riêng độ tương phản của #C9861A trên nền trắng là 2,96:1 (<3:1) nên đã có chú giải chữ, chú giải rê chuột và bảng thay thế. Chưa làm chế độ tối vì toàn app chưa có.
- Kiểm tra: build qua; smoke-ui.mjs thêm 21 kiểm tra Báo cáo, tổng 78/78 qua, chạy lặp ổn định, không lỗi console; trên điện thoại 390px trang không cuộn ngang. Ảnh: anh-smoke/14-bao-cao.png, 15-bao-cao-danh-muc.png, 16-bao-cao-chi-phi.png, 17-bao-cao-di-dong.png.
- Giới hạn đã biết: chưa thử với backend/MySQL thật (số liệu giả); ô ngày dùng định dạng theo ngôn ngữ trình duyệt; "hôm nay" tính theo giờ máy người dùng còn API tính theo giờ CSDL; chưa có xuất file Excel/PDF (đặc tả không yêu cầu).


## Bước 10 – App điện thoại cho nhân viên, đợt 1 (React Native / Expo) (đã làm; test bằng bản web + API giả; CHƯA chạy trên thiết bị thật, CHƯA chạy với backend/MySQL thật)
- Quyết định: React Native (Expo SDK 57, TypeScript, Expo Router) trong thư mục mới `mobile/`; phạm vi cả app theo yêu cầu: Lịch làm việc của tôi, Gọi món (tạo/sửa order), Thanh toán + xem hóa đơn, Tạo nhanh khách hàng, và mọi API nhân viên cần. Làm từng đợt, đợt này là nền + đăng nhập + lịch + cá nhân.
- Đã có: AUTH-01 đăng nhập (token lưu SecureStore, mở lại app tự vào; mất mạng thì giữ token, 401/403 thì bỏ), phiên hết hạn giữa chừng tự về màn đăng nhập, ô "Máy chủ" trên màn đăng nhập để nhập IP máy tính (chuẩn hóa `192.168.1.10:3000` -> `http://192.168.1.10:3000/api`, được nhớ), NS-07 lịch tuần (T2–CN, chuyển tuần, "Hôm nay", "Đang diễn ra", "Nghỉ", ca kế tiếp, kéo để làm mới, lỗi + Thử lại), tab Cá nhân (tên, quyền, máy chủ, đăng xuất có xác nhận), AUTH-02 đổi mật khẩu (luật 8–72 ký tự có chữ + số, khác mật khẩu cũ; SAI_MAT_KHAU_CU hiện ở ô, không bị đăng xuất).
- Giao diện: cùng bảng màu teal và font Be Vietnam Pro với web; vùng chạm >= 48px; hộp xác nhận dựng bằng Modal (Alert không chạy trên web).
- Kiểm tra: `tsc --noEmit` sạch, `expo lint` sạch (đã bật quy tắc React Compiler nên hook useTai viết lại không setState trong effect), `expo export --platform web` qua, `mobile/scripts/smoke-web.mjs` 29/29 (playwright, API giả; ảnh ở mobile/scripts/anh-smoke/). Chạy lại: README trong mobile/.
- Giới hạn đã biết: chưa thử trên Expo Go / máy thật (SecureStore và bàn phím chỉ kiểm được trên thiết bị); "hôm nay" và "đang diễn ra" tính theo giờ điện thoại, API tính theo giờ CSDL; `npx expo install` bị chặn nên phiên bản gói ghim bằng npm; đã cài thêm eslint + eslint-config-expo (devDependencies).
- Tiếp theo (từng đợt, dừng để duyệt): Gọi món -> Thanh toán + hóa đơn -> Tạo nhanh khách hàng.

## Sửa lỗi: app Expo bản web không gọi được API (CORS)
- Triệu chứng: /api/health ra csdl "ok" nhưng app báo "Không kết nối được máy chủ". Nguyên nhân: backend chỉ cho CORS từ http://localhost:5173 (web quản lý); app Expo bản web chạy ở http://localhost:8081 nên trình duyệt chặn. CSDL không có lỗi.
- Sửa: `CORS_ORIGIN` nhận nhiều địa chỉ cách nhau bằng dấu phẩy (mặc định 5173, 8081, 19006). Nếu backend/.env của bạn đã có `CORS_ORIGIN=http://localhost:5173` thì phải sửa thành `http://localhost:5173,http://localhost:8081` rồi chạy lại backend. App trên điện thoại thật (Expo Go) không bị CORS.
