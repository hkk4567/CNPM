// build_doc.js – sinh file Word "Đặc tả tính năng quản lý quán cà phê"
// Chạy: node build_doc.js   (cần: npm i docx)
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
  ShadingType, BorderStyle, AlignmentType, HeadingLevel, LevelFormat,
  PageOrientation, Footer, PageNumber,
} = require('docx');

const OUT = path.join(__dirname, 'Dac_ta_tinh_nang_quan_ly_quan_ca_phe.docx');
const W = 14678; // độ rộng nội dung (A4 ngang, lề 0.75")
const FONT = 'Arial';

// ---------- helpers ----------
function runs(text, opts = {}) {
  return text.split('`').map((seg, i) => ({ seg, i })).filter(x => x.seg !== '')
    .map(({ seg, i }) => new TextRun({ text: seg, font: i % 2 ? 'Consolas' : FONT, ...opts }));
}
function para(text, opts = {}, pOpts = {}) {
  return new Paragraph({ spacing: { after: 100 }, children: runs(text, opts), ...pOpts });
}
function bullet(text) {
  return new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 60 }, children: runs(text) });
}
const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
const borders = { top: border, bottom: border, left: border, right: border };

function cell(text, width, { header = false, size = 18 } = {}) {
  const lines = String(text).split('\n');
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    shading: header ? { fill: 'D9E2F3', type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: lines.map(l => new Paragraph({ spacing: { after: 20 }, children: runs(l, { size, bold: header }) })),
  });
}
function table(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  if (total !== W) throw new Error('Tổng cột ' + total + ' != ' + W);
  return new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((h, i) => cell(h, widths[i], { header: true })) }),
      ...rows.map(r => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, widths[i])) })),
    ],
  });
}
const h1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 140 }, children: [new TextRun({ text: t, font: FONT })] });
const h2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 }, children: [new TextRun({ text: t, font: FONT })] });
const gap = () => new Paragraph({ spacing: { after: 120 }, children: [] });
function code(block) {
  return block.trim().split('\n').map(l => new Paragraph({
    spacing: { after: 0 },
    shading: { fill: 'F2F2F2', type: ShadingType.CLEAR, color: 'auto' },
    children: [new TextRun({ text: l === '' ? ' ' : l, font: 'Consolas', size: 17 })],
  }));
}

// ---------- dữ liệu ----------
const H6 = ['ID', 'Tính năng', 'Đầu vào', 'Kiểm tra / xử lý', 'Đầu ra', 'Lỗi'];
const W6 = [900, 1800, 3100, 4300, 3200, 1378];
const H7 = ['ID', 'Tính năng', 'Quyền', 'Đầu vào', 'Kiểm tra / xử lý', 'Đầu ra', 'Lỗi'];
const W7 = [800, 1600, 800, 2800, 3900, 2900, 1878];

const auth = [
  ['AUTH-01', 'Đăng nhập', '`ten_dang_nhap`, `mat_khau`', 'Tìm `TaiKhoan`, so sánh bcrypt với `mat_khau_hash`', '`token`, `{ma_tai_khoan, ma_nhan_vien, ho_ten, quyen_truy_cap}`', '401 sai thông tin (không tiết lộ sai tên hay sai mật khẩu)'],
  ['AUTH-02', 'Đổi mật khẩu (A/Q/N)', '`mat_khau_cu`, `mat_khau_moi`', 'Đúng mật khẩu cũ; mới ≥ 8 ký tự, khác cũ; băm bcrypt', '`{ "da_doi": true }`', '400 mật khẩu yếu\n401 sai mật khẩu cũ'],
];

const sp = [
  ['SP-01', 'CRUD danh mục', '`ten_danh_muc`', 'Tên không trùng (409 `TRUNG_TEN_DANH_MUC`); tự cắt khoảng trắng hai đầu\nXóa bị chặn nếu còn sản phẩm (409 `DANH_MUC_DANG_DUNG`)\nXem danh sách: mọi quyền; thêm/sửa/xóa: A/Q', 'Danh mục; khi liệt kê kèm `so_san_pham`', '400, 404, 409'],
  ['SP-02', 'Tạo sản phẩm', '`ma_danh_muc`, `ten_san_pham`, `gia_ban`, `trang_thai?` (mặc định `con_ban`)', 'Danh mục tồn tại; `gia_ban` là số, 0 ≤ `gia_ban` ≤ 100.000.000', 'Sản phẩm (kèm `ten_danh_muc`)', '400, 404 danh mục'],
  ['SP-03', 'Sửa sản phẩm / ngừng bán', '`ma_san_pham`, các trường cần đổi (gửi PATCH)', 'Ít nhất một trường; đổi giá không ảnh hưởng hóa đơn cũ (đã snapshot)\nNgừng bán = đặt `trang_thai = \'ngung_ban\'`, món biến khỏi menu', 'Sản phẩm cập nhật', '400, 404'],
  ['SP-04', 'Xóa sản phẩm', '`ma_san_pham`', 'Chỉ xóa khi chưa có `ChiTietHoaDon`; xóa kèm `CongThuc` và `KhuyenMaiSanPham` trong một transaction\nĐã bán thì dùng ngừng bán thay vì xóa', '`{ "da_xoa": true }`', '404\n409 `SAN_PHAM_DA_BAN`'],
  ['SP-05', 'Danh sách / chi tiết sản phẩm (quản trị)', '`ma_danh_muc?`, `tu_khoa?`, `trang_thai?`, `trang?`, `moi_trang?`', 'Gồm cả sản phẩm ngừng bán; `tu_khoa` tìm không phân biệt dấu; sắp theo `ma_san_pham`', 'Mảng sản phẩm + `tong_so_ban_ghi`, `trang`, `moi_trang`', '400, 404'],
];

const pos = [
  ['POS-01', 'Xem menu', '`ma_danh_muc?`, `tu_khoa?`', 'Chỉ `SanPham.trang_thai = \'con_ban\'`; tra khuyến mãi đang hiệu lực (Phụ lục A.2); tính `so_ly_toi_da` theo tồn kho (Phụ lục A.3), sản phẩm chưa có công thức thì không giới hạn\n`gia_sau_giam`, `ma_khuyen_mai` bổ sung ở Sprint 3 khi có module khuyến mãi', 'Mảng `{ma_san_pham, ten_san_pham, gia_ban, gia_sau_giam, ma_khuyen_mai?, so_ly_toi_da, du_nguyen_lieu, ten_danh_muc}`\n`so_ly_toi_da` = null khi chưa có công thức (không giới hạn); `du_nguyen_lieu` = false khi `so_ly_toi_da` = 0', ''],
  ['POS-02', 'Tạo order', '`ma_khach_hang?`\n`items[]: {ma_san_pham, so_luong, ghi_chu?}`', '`items` 1–50 dòng; `so_luong` nguyên 1–99; `ghi_chu` ≤ 255 ký tự; sản phẩm tồn tại và còn bán; mỗi dòng một `ma_chi_tiet` (cùng sản phẩm, ghi chú khác vẫn được)\n`ma_nhan_vien` lấy từ token (bỏ qua nếu client gửi)\n`so_thu_tu` = MAX trong ngày + 1, cấp trong transaction có khóa tên nên không trùng khi nhiều order tạo cùng lúc\nSnapshot `don_gia`; `giam_gia` = 0, `ma_khuyen_mai` = NULL cho đến Sprint 3\n`trang_thai = \'dang_pha_che\'`\nKiểm tra đủ nguyên liệu cho các dòng (Phụ lục A.4)', 'Hóa đơn `{ma_hoa_don, so_thu_tu, thoi_gian_tao, trang_thai, ma_khach_hang, ten_khach_hang, ma_nhan_vien, ten_nhan_vien, chi_tiet[], tong_tien_tam_tinh}`\n`chi_tiet[]: {ma_chi_tiet, ma_san_pham, ten_san_pham, so_luong, don_gia, giam_gia, ma_khuyen_mai, ghi_chu, thanh_tien}`\nHTTP 201', '400 `SAN_PHAM_NGUNG_BAN`, `DU_LIEU_SAI`\n404 sản phẩm / khách không tồn tại\n409 KHONG_DU_NGUYEN_LIEU'],
  ['POS-03', 'Thêm món vào order', '`ma_hoa_don` (trên đường dẫn), `ma_san_pham`, `so_luong`, `ghi_chu?`', 'Khóa dòng `HoaDon` (FOR UPDATE) rồi kiểm tra chưa `da_thanh_toan`/`huy`\nSản phẩm tồn tại và còn bán; snapshot giá lúc thêm (khuyến mãi từ Sprint 3)\nLuôn thêm dòng mới (cùng sản phẩm, ghi chú khác là hai dòng)\nKiểm tra đủ nguyên liệu cho TOÀN BỘ order sau khi thêm (Phụ lục A.4)', 'Hóa đơn cập nhật (HTTP 201)', '400 `SAN_PHAM_NGUNG_BAN`\n404 order/sản phẩm\n409 `HOA_DON_DA_DONG`\n409 KHONG_DU_NGUYEN_LIEU'],
  ['POS-04', 'Sửa dòng món', '`ma_hoa_don`, `ma_chi_tiet` (trên đường dẫn), `so_luong?`, `ghi_chu?` (null hoặc rỗng = xóa ghi chú)', 'Như POS-03; dòng phải thuộc đúng hóa đơn; ít nhất một trường\nĐổi `so_luong` thì giữ nguyên mức giảm trên mỗi ly (`giam_gia` tính lại theo tỷ lệ)\nChỉ kiểm tra nguyên liệu khi TĂNG nhu cầu; giảm số lượng và đổi ghi chú luôn được phép', 'Hóa đơn cập nhật', '400, 404\n409 `HOA_DON_DA_DONG`\n409 KHONG_DU_NGUYEN_LIEU'],
  ['POS-05', 'Xóa dòng món', '`ma_hoa_don`, `ma_chi_tiet` (trên đường dẫn)', 'Như POS-03; không xóa dòng cuối cùng (phải hủy order)', 'Hóa đơn cập nhật', '404\n409 `HOA_DON_DA_DONG`\n409 `KHONG_XOA_DONG_CUOI`'],
  ['POS-06', 'Gắn khách thành viên', '`ma_hoa_don`, `so_dien_thoai`', 'Tìm `KhachHang` theo SĐT', '`{ma_khach_hang, ten_khach_hang, diem_tich_luy}`', '404 chưa có khách (giao diện gợi ý KH-01)'],
  ['POS-07', 'Đổi trạng thái', '`ma_hoa_don`, `trang_thai_moi`', 'Chuyển hợp lệ: `dang_pha_che → da_phuc_vu`; `dang_pha_che`/`da_phuc_vu → huy`\nThanh toán dùng POS-08, không đi qua đây; hóa đơn đã đóng không đổi được', 'Hóa đơn cập nhật', '400 giá trị sai\n404\n409 `CHUYEN_TRANG_THAI_KHONG_HOP_LE`, `HOA_DON_DA_DONG`'],
  ['POS-08', 'Thanh toán', '`ma_hoa_don` (đường dẫn), `phuong_thuc_thanh_toan` (`tien_mat`/`chuyen_khoan`/`vi`)', 'Một transaction; khóa theo thứ tự HoaDon, NguyenLieu (mã tăng dần), KhachHang\n1. Hóa đơn còn mở (đã thanh toán/đã hủy: 409)\n2. Chốt `tong_tien` = tổng (`so_luong` x `don_gia` - `giam_gia`) các dòng\n3. Khóa nguyên liệu, đọc lại tồn, kiểm tra đủ (Phụ lục A.4) rồi trừ kho theo `CongThuc`; thiếu thì ROLLBACK toàn bộ. CHECK `so_luong_ton >= 0` là chốt chặn cuối\n4. Ghi `da_thanh_toan`, chỉ khi hóa đơn chưa thanh toán nên không chạy hai lần\n5. Có khách: cộng `FLOOR(tong_tien / 10000)` điểm', '`{hoa_don, diem_cong, diem_hien_tai, canh_bao_kho[]}`\n`diem_hien_tai` = null với khách vãng lai\n`canh_bao_kho[]: {ma_nguyen_lieu, ten_nguyen_lieu, don_vi_tinh, so_luong_ton, muc_ton_toi_thieu}` cho nguyên liệu vừa trừ mà tồn <= mức tối thiểu', '400 giá trị sai\n404\n409 `HOA_DON_DA_DONG`\n409 KHONG_DU_NGUYEN_LIEU'],
  ['POS-09', 'Hủy order', '`ma_hoa_don`', 'Chỉ hủy khi chưa `da_thanh_toan`; dùng chung logic POS-07\nKhông trừ kho (kho chỉ trừ lúc thanh toán)', 'Hóa đơn `trang_thai = huy`', '404\n409 `HOA_DON_DA_DONG`'],
  ['POS-10', 'Danh sách order', '`ngay?` (mặc định hôm nay), `trang_thai?`, `ma_nhan_vien?`', '`ngay` dạng YYYY-MM-DD hợp lệ; N chỉ xem order hôm nay (xin ngày khác: 403); sắp xếp tăng dần theo `so_thu_tu`\n`so_mon` = tổng số ly/phần; `tong_tien` = số đã chốt nếu `da_thanh_toan`, ngược lại là tạm tính từ các dòng\nPhân trang, mặc định 50 dòng, tối đa 200', 'Mảng `{ma_hoa_don, so_thu_tu, thoi_gian_tao, trang_thai, phuong_thuc_thanh_toan, ma_khach_hang, ten_khach_hang, ma_nhan_vien, ten_nhan_vien, so_mon, tong_tien}` + `tong_so_ban_ghi`, `trang`, `moi_trang`', '400 tham số sai\n403 N xem ngày khác'],
  ['POS-11', 'Xem/in hóa đơn', '`ma_hoa_don` (đường dẫn)', 'Join `HoaDon`, `ChiTietHoaDon`, `SanPham`, `KhachHang`, `NhanVien`\nNhân viên chỉ xem hóa đơn tạo hôm nay (403), cùng quy tắc với POS-10', 'Hóa đơn đầy đủ để in bill: thông tin chung, `chi_tiet[]`, `tong_tien_hang`, `tong_giam_gia`, `tong_tien_tam_tinh`, `tong_tien` (số đã chốt, null nếu chưa thanh toán)', '400, 403, 404'],
];

const km = [
  ['KM-01', 'Tạo khuyến mãi', '`ten_khuyen_mai`, `loai_giam`, `gia_tri_giam`, `ngay_bat_dau`, `ngay_ket_thuc`, `ma_san_pham[]?`', 'Bắt đầu < kết thúc; `phan_tram` trong (0,100]; `so_tien` > 0\nCó `ma_san_pham[]` thì ghi `KhuyenMaiSanPham` cùng transaction', '`{ma_khuyen_mai, ...}`', '400'],
  ['KM-02', 'Sửa khuyến mãi', '`ma_khuyen_mai`, các trường cần đổi', 'Như KM-01. Không ảnh hưởng hóa đơn cũ (đã snapshot)', 'Khuyến mãi cập nhật', '404'],
  ['KM-03', 'Xóa khuyến mãi', '`ma_khuyen_mai`', 'Đã có `ChiTietHoaDon.ma_khuyen_mai` tham chiếu thì chặn xóa, gợi ý đặt `ngay_ket_thuc = NOW()`', '`{ "da_xoa": true }`', '409 đã được dùng'],
  ['KM-04', 'Thêm sản phẩm vào khuyến mãi', '`ma_khuyen_mai`, `ma_san_pham[]`', 'Bỏ qua cặp đã tồn tại', 'Danh sách sản phẩm hiện tại', '404'],
  ['KM-05', 'Gỡ sản phẩm khỏi khuyến mãi', '`ma_khuyen_mai`, `ma_san_pham`', 'Xóa dòng `KhuyenMaiSanPham`', 'Danh sách còn lại', '404'],
  ['KM-06', 'Danh sách khuyến mãi', '`trang_thai?` (`sap_dien_ra`/`dang_chay`/`het_han`), `ma_san_pham?`', 'Trạng thái suy ra từ ngày, không lưu cột', 'Mảng khuyến mãi + `so_san_pham`', ''],
  ['KM-07', 'Báo cáo hiệu quả', '`ma_khuyen_mai`, `tu_ngay?`, `den_ngay?`', '`GROUP BY ma_khuyen_mai` trên `ChiTietHoaDon` (chỉ hóa đơn `da_thanh_toan`)', '`{so_luong_ban, tong_tien_giam, doanh_thu_sau_giam}`', ''],
];

const kh = [
  ['KH-01', 'Tạo khách', 'A/Q/N', '`ten_khach_hang`, `so_dien_thoai`', 'SĐT đúng định dạng, UNIQUE; `diem_tich_luy = 0`', '`{ma_khach_hang, ...}`', '409 SĐT đã tồn tại'],
  ['KH-02', 'Sửa khách', 'A/Q', '`ma_khach_hang`, `ten_khach_hang?`, `so_dien_thoai?`', 'Không cho sửa `diem_tich_luy` trực tiếp', 'Khách cập nhật', '409 trùng SĐT'],
  ['KH-03', 'Tìm khách', 'A/Q/N', '`tu_khoa` (tên hoặc SĐT)', '`LIKE`, giới hạn 20 kết quả', 'Mảng `{ma_khach_hang, ten, sdt, diem}`', ''],
  ['KH-04', 'Lịch sử mua', 'A/Q', '`ma_khach_hang`, `tu_ngay?`, `den_ngay?`', 'Hóa đơn `da_thanh_toan` của khách', 'Mảng hóa đơn + tổng chi tiêu', '404'],
  ['KH-05', 'Top khách thân thiết', 'A/Q', '`tu_ngay`, `den_ngay`, `top` (mặc định 10)', '`GROUP BY ma_khach_hang`, `SUM(tong_tien)`', 'Mảng `{ma_khach_hang, ten, so_don, tong_chi_tieu}`', ''],
];

const kho = [
  ['KHO-01', 'CRUD nguyên liệu', '`ten_nguyen_lieu`, `don_vi_tinh`', '`so_luong_ton` khởi tạo 0, chỉ đổi qua nhập/xuất\nXóa bị chặn nếu đã có trong `CongThuc`/`ChiTietNhap`', 'Nguyên liệu', '409 đang được dùng'],
  ['KHO-02', 'CRUD nhà cung cấp', '`ten_ncc`, `so_dien_thoai`, `dia_chi`', 'Xóa bị chặn nếu đã có `PhieuNhap`', 'Nhà cung cấp', '409'],
  ['KHO-03', 'Đặt công thức pha chế', '`ma_san_pham`\n`nguyen_lieu[]: {ma_nguyen_lieu, dinh_luong}`', '`dinh_luong` > 0; thay toàn bộ công thức cũ trong transaction', 'Công thức mới của sản phẩm', '400'],
  ['KHO-04', 'Lập phiếu nhập', '`ma_ncc`, `ngay_nhap`\n`items[]: {ma_nguyen_lieu, so_luong_nhap, don_gia_nhap}`', 'Một transaction: tạo `PhieuNhap` + `ChiTietNhap`, `tong_tien_nhap = Σ`, cộng `so_luong_ton`', '`{ma_phieu_nhap, tong_tien_nhap, ton_moi[]}`', '400 số lượng/giá ≤ 0\n404 NCC'],
  ['KHO-05', 'Lịch sử nhập', '`tu_ngay?`, `den_ngay?`, `ma_ncc?`', 'Join `PhieuNhap`, `NhaCungCap`, `NhanVien`', 'Mảng phiếu nhập', ''],
  ['KHO-06', 'Xem tồn kho / cảnh báo', '`chi_sap_het?`', 'Cảnh báo khi `so_luong_ton <= muc_ton_toi_thieu`', 'Mảng `{ma_nguyen_lieu, ten, so_luong_ton, don_vi_tinh}`', ''],
];

const ns = [
  ['NS-01', 'Tạo nhân viên + tài khoản', 'A', '`ho_ten`, `chuc_vu`, `so_dien_thoai`, `ten_dang_nhap`, `mat_khau`, `quyen_truy_cap`', 'Một transaction; `ten_dang_nhap` UNIQUE; băm mật khẩu', '`{ma_nhan_vien, ma_tai_khoan}` (không trả mật khẩu)', '409 trùng tên đăng nhập'],
  ['NS-02', 'Sửa nhân viên / đổi quyền', 'A (Q sửa thông tin)', '`ma_nhan_vien`, các trường cần đổi', 'Chỉ A đổi `quyen_truy_cap`; Q không sửa tài khoản admin', 'Nhân viên cập nhật', '403'],
  ['NS-03', 'Xóa nhân viên', 'A', '`ma_nhan_vien`', 'Đã có hóa đơn/phiếu nhập thì không xóa mà đặt `trang_thai = \'nghi_viec\'`; nhân viên nghỉ việc bị chặn đăng nhập, không được chọn khi tạo order/xếp ca', '`{ "da_xoa": true }`', '409'],
  ['NS-04', 'CRUD ca làm việc', 'A/Q', '`ten_ca`, `thoi_gian_bat_dau`, `thoi_gian_ket_thuc`', 'Xóa bị chặn nếu đã có `PhanCong`', 'Ca', '409'],
  ['NS-05', 'Xếp lịch làm việc', 'A/Q', '`ma_nhan_vien`, `ma_ca`, `ngay_lam` (hoặc mảng nhiều ngày)', 'Khóa chính chặn trùng; ngày ≥ hôm nay', 'Danh sách phân công vừa tạo', '409 đã xếp'],
  ['NS-06', 'Xóa phân công', 'A/Q', '`ma_nhan_vien`, `ma_ca`, `ngay_lam`', '', '`{ "da_xoa": true }`', '404'],
  ['NS-07', 'Xem lịch tuần', 'A/Q (N chỉ của mình)', '`tu_ngay` (đầu tuần), `ma_nhan_vien?`', 'Join `PhanCong`, `CaLamViec`, `NhanVien`', 'Mảng `{ngay_lam, ten_ca, gio, ho_ten}`', ''],
];

const bc = [
  ['BC-01', 'Doanh thu theo thời gian', '`tu_ngay`, `den_ngay`, `nhom` (`ngay`/`tuan`/`thang`)', '`HoaDon` `da_thanh_toan`, `GROUP BY DATE(thoi_gian_tao)`…', 'Mảng `{ky, so_don, doanh_thu}`'],
  ['BC-02', 'Sản phẩm bán chạy', '`tu_ngay`, `den_ngay`, `top`', '`ChiTietHoaDon` + `SanPham`, `SUM(so_luong)`', 'Mảng `{ten_san_pham, so_luong, doanh_thu}`'],
  ['BC-03', 'Doanh thu theo danh mục', '`tu_ngay`, `den_ngay`', '+ `DanhMuc`', 'Mảng `{ten_danh_muc, doanh_thu, ty_le}`'],
  ['BC-04', 'Theo phương thức thanh toán', '`tu_ngay`, `den_ngay`', '`GROUP BY phuong_thuc_thanh_toan`', 'Mảng `{phuong_thuc, so_don, tong_tien}`'],
  ['BC-05', 'Chi phí nhập vs doanh thu', '`tu_ngay`, `den_ngay`, `nhom`', '`PhieuNhap.tong_tien_nhap` đối chiếu `HoaDon.tong_tien`', 'Mảng `{ky, doanh_thu, chi_phi_nhap, chenh_lech}`'],
  ['BC-06', 'Doanh thu theo nhân viên', '`tu_ngay`, `den_ngay`', '`GROUP BY ma_nhan_vien`', 'Mảng `{ho_ten, so_don, doanh_thu}`'],
];

const perm = [
  ['POS (order, thanh toán)', '✓', '✓', '✓'],
  ['Khách hàng', '✓', '✓', '✓ (tạo/tìm)'],
  ['Sản phẩm, danh mục, công thức', '✓', '✓', '✗'],
  ['Khuyến mãi', '✓', '✓', '✗'],
  ['Kho, nhập hàng, nhà cung cấp', '✓', '✓', '✗'],
  ['Nhân sự, phân công', '✓', '✓', 'xem lịch của mình'],
  ['Tài khoản', '✓', '✗', '✗'],
  ['Báo cáo', '✓', '✓', '✗'],
];

const errs = [
  ['400', 'Dữ liệu đầu vào sai hoặc thiếu'],
  ['401', 'Chưa đăng nhập hoặc token hết hạn'],
  ['403', 'Không đủ quyền'],
  ['404', 'Không tồn tại'],
  ['409', 'Xung đột nghiệp vụ (trùng dữ liệu, sai trạng thái, đang được tham chiếu)'],
];

const gaps = [
  ['1', '`NguyenLieu.muc_ton_toi_thieu`', 'Cần cho KHO-06: cảnh báo sắp hết hàng'],
  ['2', '`NhanVien.trang_thai` (`dang_lam` / `nghi_viec`)', 'Cần cho NS-03: nghỉ việc mà vẫn giữ lịch sử hóa đơn'],
  ['3', '`ChiTietHoaDon.ma_chi_tiet` (khóa chính riêng)', 'Cho POS-04/05: một hóa đơn có nhiều dòng cùng sản phẩm khác ghi chú'],
];

const sqlPay = `
START TRANSACTION;

UPDATE HoaDon
SET trang_thai = 'da_thanh_toan',
    phuong_thuc_thanh_toan = :pttt,
    tong_tien = (SELECT SUM(so_luong * don_gia - giam_gia)
                 FROM ChiTietHoaDon WHERE ma_hoa_don = :id)
WHERE ma_hoa_don = :id AND trang_thai <> 'da_thanh_toan';

UPDATE KhachHang k
JOIN HoaDon h ON h.ma_khach_hang = k.ma_khach_hang
SET k.diem_tich_luy = k.diem_tich_luy + FLOOR(h.tong_tien / 10000)
WHERE h.ma_hoa_don = :id;

-- Trừ kho: service đã kiểm tra A.4; CHECK so_luong_ton >= 0 chặn nếu vẫn thiếu (bắt lỗi 4025 -> 409)
UPDATE NguyenLieu nl
JOIN (
  SELECT ct.ma_nguyen_lieu, SUM(c.so_luong * ct.dinh_luong) AS can_tru
  FROM ChiTietHoaDon c
  JOIN CongThuc ct ON ct.ma_san_pham = c.ma_san_pham
  WHERE c.ma_hoa_don = :id
  GROUP BY ct.ma_nguyen_lieu
) x ON x.ma_nguyen_lieu = nl.ma_nguyen_lieu
SET nl.so_luong_ton = nl.so_luong_ton - x.can_tru;

COMMIT;`;

const api = [
  ['POST', '/api/auth/dang-nhap', 'AUTH-01 đăng nhập', 'chưa cần đăng nhập'],
  ['GET', '/api/auth/toi', 'Thông tin người đang đăng nhập', 'A/Q/N'],
  ['GET', '/api/health', 'Kiểm tra máy chủ và CSDL', 'chưa cần đăng nhập'],
  ['GET', '/api/danh-muc', 'SP-01 xem danh mục', 'A/Q/N'],
  ['POST, PUT, DELETE', '/api/danh-muc, /api/danh-muc/:ma', 'SP-01 thêm, sửa, xóa danh mục', 'A/Q'],
  ['GET', '/api/san-pham/menu', 'POS-01 menu (so_ly_toi_da, du_nguyen_lieu)', 'A/Q/N'],
  ['GET', '/api/san-pham, /api/san-pham/:ma', 'SP-05 danh sách, chi tiết sản phẩm', 'A/Q'],
  ['POST', '/api/san-pham', 'SP-02 tạo sản phẩm', 'A/Q'],
  ['PATCH', '/api/san-pham/:ma', 'SP-03 sửa, ngừng bán', 'A/Q'],
  ['DELETE', '/api/san-pham/:ma', 'SP-04 xóa sản phẩm', 'A/Q'],
  ['POST', '/api/hoa-don', 'POS-02 tạo order', 'A/Q/N'],
  ['GET', '/api/hoa-don', 'POS-10 danh sách order', 'A/Q/N'],
  ['POST', '/api/hoa-don/:ma/dong', 'POS-03 thêm món vào order', 'A/Q/N'],
  ['PATCH', '/api/hoa-don/:ma/dong/:ma_chi_tiet', 'POS-04 sửa dòng món', 'A/Q/N'],
  ['DELETE', '/api/hoa-don/:ma/dong/:ma_chi_tiet', 'POS-05 xóa dòng món', 'A/Q/N'],
  ['PATCH', '/api/hoa-don/:ma/trang-thai', 'POS-07 đổi trạng thái', 'A/Q/N'],
  ['POST', '/api/hoa-don/:ma/huy', 'POS-09 hủy order', 'A/Q/N'],
  ['POST', '/api/hoa-don/:ma/thanh-toan', 'POS-08 thanh toán (chốt tiền, cộng điểm, trừ kho)', 'A/Q/N'],
  ['GET', '/api/hoa-don/:ma', 'POS-11 xem/in hóa đơn (nhân viên chỉ hóa đơn hôm nay)', 'A/Q/N'],
];

const sqlMax = `
-- Số ly tối đa theo tồn kho; sản phẩm chưa có công thức thì không xuất hiện (= không giới hạn)
SELECT sp.ma_san_pham,
       MIN(FLOOR(nl.so_luong_ton / ct.dinh_luong)) AS so_ly_toi_da
FROM SanPham sp
JOIN CongThuc ct   ON ct.ma_san_pham = sp.ma_san_pham
JOIN NguyenLieu nl ON nl.ma_nguyen_lieu = ct.ma_nguyen_lieu
GROUP BY sp.ma_san_pham;`;

const sqlThieu = `
-- Nguyên liệu còn thiếu cho toàn bộ dòng của một hóa đơn (rỗng = đủ)
SELECT nl.ten_nguyen_lieu, nl.don_vi_tinh, nl.so_luong_ton,
       x.can_dung, x.can_dung - nl.so_luong_ton AS con_thieu
FROM NguyenLieu nl
JOIN (
  SELECT ct.ma_nguyen_lieu, SUM(c.so_luong * ct.dinh_luong) AS can_dung
  FROM ChiTietHoaDon c
  JOIN CongThuc ct ON ct.ma_san_pham = c.ma_san_pham
  WHERE c.ma_hoa_don = :id
  GROUP BY ct.ma_nguyen_lieu
) x ON x.ma_nguyen_lieu = nl.ma_nguyen_lieu
WHERE nl.so_luong_ton < x.can_dung;`;

const sqlPromo = `
SELECT km.ma_khuyen_mai,
       CASE km.loai_giam
         WHEN 'phan_tram' THEN sp.gia_ban * km.gia_tri_giam / 100
         ELSE km.gia_tri_giam
       END AS so_tien_giam
FROM KhuyenMaiSanPham kmsp
JOIN KhuyenMai km ON km.ma_khuyen_mai = kmsp.ma_khuyen_mai
JOIN SanPham sp   ON sp.ma_san_pham  = kmsp.ma_san_pham
WHERE kmsp.ma_san_pham = :sp
  AND NOW() BETWEEN km.ngay_bat_dau AND km.ngay_ket_thuc
ORDER BY so_tien_giam DESC
LIMIT 1;`;

// ---------- nội dung ----------
const children = [
  new Paragraph({ alignment: AlignmentType.LEFT, spacing: { before: 200, after: 80 },
    children: [new TextRun({ text: 'ĐẶC TẢ TÍNH NĂNG', font: FONT, bold: true, size: 44, color: '1F3864' })] }),
  new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'Hệ thống quản lý quán cà phê', font: FONT, size: 30, color: '404040' })] }),
  new Paragraph({ spacing: { after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '1F3864', space: 4 } },
    children: [new TextRun({ text: 'Đầu vào / đầu ra từng tính năng, dựa trên ERD đã chốt', font: FONT, size: 20, italics: true, color: '595959' })] }),

  h1('1. Phạm vi và quy ước chung'),
  para('Mô hình vận hành: khách uống tại quán, nhân viên nhập order vào hệ thống (không có quản lý bàn). Các bảng chính: `DanhMuc`, `SanPham`, `HoaDon`, `ChiTietHoaDon`, `KhuyenMai`, `KhuyenMaiSanPham`, `KhachHang`, `CaLamViec`, `NhanVien`, `PhanCong`, `TaiKhoan`, `NhaCungCap`, `NguyenLieu`, `CongThuc`, `PhieuNhap`, `ChiTietNhap`.'),
  bullet('Mọi API (trừ AUTH-01) yêu cầu header `Authorization: Bearer <token>`.'),
  bullet('Thành công: `{ "ok": true, "data": ... }`. Lỗi: `{ "ok": false, "loi": "MA_LOI", "thong_bao": "..." }`.'),
  bullet('Danh sách có phân trang: đầu vào thêm `trang`, `moi_trang`; đầu ra thêm `tong_so_ban_ghi`.'),
  bullet('Tồn kho không được âm. Không đủ nguyên liệu để pha món: HTTP 409, `loi = "KHONG_DU_NGUYEN_LIEU"`, kèm `chi_tiet[]: {ten_nguyen_lieu, don_vi_tinh, so_luong_ton, can_dung, con_thieu}`. Ví dụ thông báo: "Không đủ nguyên liệu: Cà phê bột cần 20 g, còn 4 g (thiếu 16 g)".'),
  bullet('Kiểm tra nguyên liệu ở hai lớp: khi nhập/sửa order (báo sớm cho nhân viên) và khi thanh toán (chốt chặn, vì nhiều order đang mở có thể cùng dùng một nguyên liệu).'),
  bullet('Ký hiệu quyền: A = admin, Q = quản lý, N = nhân viên (lưu ở `TaiKhoan.quyen_truy_cap`).'),
  bullet('ERD dùng khóa chính riêng `ma_chi_tiet` cho `ChiTietHoaDon`. Dấu `?` sau tên trường = không bắt buộc.'),
  gap(),
  h2('Mã lỗi HTTP'),
  table(['Mã', 'Ý nghĩa'], errs, [3000, 11678]),

  h1('2. Phân quyền đề xuất'),
  table(['Chức năng', 'admin', 'quan_ly', 'nhan_vien'], perm, [6000, 2892, 2893, 2893]),

  h1('3. Danh sách tính năng'),
  h2('3.0 Xác thực'),
  table(H6, auth, W6),
  h2('3.1 Sản phẩm và danh mục – A/Q (xem menu: A/Q/N). Backlog gộp chung là SP-01'),
  table(H6, sp, W6),
  h2('3.2 Bán hàng (POS) – A/Q/N'),
  table(H6, pos, W6),
  h2('3.3 Khuyến mãi theo sản phẩm – A/Q'),
  table(H6, km, W6),
  h2('3.4 Khách hàng'),
  table(H7, kh, W7),
  h2('3.5 Kho và nhập hàng – A/Q'),
  table(H6, kho, W6),
  h2('3.6 Nhân sự'),
  table(H7, ns, W7),
  h2('3.7 Báo cáo – A/Q'),
  table(['ID', 'Báo cáo', 'Đầu vào', 'Nguồn / xử lý', 'Đầu ra'], bc, [800, 2200, 3400, 4400, 3878]),

  h1('4. Thay đổi ERD đã áp dụng'),
  para('Ba thay đổi phát sinh khi viết đặc tả, đã đưa vào ERD (file `erd/cafe_erd.mmd`):'),
  table(['#', 'Cột / thay đổi', 'Lý do'], gaps, [1000, 5500, 8178]),
  gap(),
  para('Khi tạo CSDL cần thêm index cho `ChiTietHoaDon(ma_hoa_don)` và `ChiTietHoaDon(ma_san_pham)`, cùng ràng buộc UNIQUE cho `KhachHang.so_dien_thoai` và `TaiKhoan.ten_dang_nhap` (ERD Mermaid không thể hiện hết).'),

  h1('Phụ lục A. SQL cốt lõi'),
  h2('A.1 Thanh toán (POS-08): một transaction gồm đổi trạng thái, cộng điểm, trừ kho'),
  ...code(sqlPay),
  para('Cài đặt thực tế (POS-08): mỗi nguyên liệu được khóa (FOR UPDATE, theo mã tăng dần) và đọc lại tồn trước khi trừ, nên hai thanh toán đồng thời cùng dùng một nguyên liệu chạy nối tiếp và tồn không bao giờ âm. Mỗi nguyên liệu trừ bằng một lệnh UPDATE riêng thay vì UPDATE gộp ở trên; kết quả giống nhau. Cứ 10.000 đồng tổng tiền được 1 điểm, làm tròn xuống.'),
  gap(),
  h2('A.2 Khuyến mãi đang hiệu lực cho một sản phẩm (POS-01, POS-02): lấy mức giảm cao nhất'),
  ...code(sqlPromo),
  gap(),
  h2('A.3 Số ly tối đa theo tồn kho (POS-01)'),
  ...code(sqlMax),
  gap(),
  h2('A.4 Nguyên liệu còn thiếu cho một hóa đơn (POS-02/03/04/08)'),
  ...code(sqlThieu),
  gap(),
  para('Lưu ý: nếu một sản phẩm có nhiều khuyến mãi cùng lúc, đoạn SQL trên chọn mức giảm cao nhất. Có thể đổi quy tắc ở tầng ứng dụng (ví dụ chỉ cho một khuyến mãi hoạt động tại một thời điểm).'),
  gap(),
  h1('Phụ lục B. Danh sách API đã cài đặt'),
  para('Cập nhật theo từng bước phát triển. Mọi API (trừ đăng nhập và health) cần header `Authorization: Bearer <token>`.'),
  table(['Phương thức', 'Đường dẫn', 'Tính năng', 'Quyền'], api, [1800, 5400, 4878, 2600]),
];

const doc = new Document({
  creator: 'Kazana',
  title: 'Đặc tả tính năng quản lý quán cà phê',
  styles: {
    default: { document: { run: { font: FONT, size: 20 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: FONT, color: '1F3864' }, paragraph: { spacing: { before: 300, after: 140 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 25, bold: true, font: FONT, color: '2E5597' }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE },
        margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 },
      },
    },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Đặc tả tính năng quản lý quán cà phê – Trang ', font: FONT, size: 16, color: '7F7F7F' }),
        new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: '7F7F7F' })] })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf);
  console.log('Đã tạo:', OUT);
});
