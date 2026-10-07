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
