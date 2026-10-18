// Danh sách mã trang/tab của web admin có thể ẩn (dùng chung cho backend và scripts/an-trang/an-trang.js).
// Mã trang = đường dẫn route bỏ dấu "/" đầu. Mã tab = "<trang>/<tab>", khớp khóa tab trong frontend/src/pages/<trang>/index.jsx.
// Ẩn mã trang (vd. "kho") = ẩn mọi tab bên trong; ẩn mã tab (vd. "kho/lich-su-nhap") = chỉ ẩn tab đó.
// Thêm trang/tab mới ở frontend thì thêm vào đây để script nhận ra.
const CAU_TRUC = [
  { ma: 'hoa-don', nhan: 'Hóa đơn' },
  { ma: 'san-pham', nhan: 'Sản phẩm' },
  { ma: 'khuyen-mai', nhan: 'Khuyến mãi' },
  { ma: 'kho', nhan: 'Kho', tab: [['ton-kho', 'Tồn kho'], ['nguyen-lieu', 'Nguyên liệu'], ['lich-su-nhap', 'Lịch sử nhập'], ['nha-cung-cap', 'Nhà cung cấp']] },
  { ma: 'khach-hang', nhan: 'Khách hàng', tab: [['tra-cuu', 'Tra cứu'], ['than-thiet', 'Khách thân thiết']] },
  { ma: 'lich-lam-viec', nhan: 'Lịch làm việc', tab: [['lich-tuan', 'Lịch tuần'], ['ca', 'Ca làm việc']] },
  { ma: 'nhan-vien', nhan: 'Nhân viên' },
  { ma: 'tai-khoan', nhan: 'Tài khoản và quyền' },
  { ma: 'bao-cao', nhan: 'Báo cáo', tab: [['doanh-thu', 'Doanh thu'], ['san-pham', 'Sản phẩm bán chạy'], ['danh-muc', 'Theo danh mục'], ['thanh-toan', 'Phương thức thanh toán'], ['chi-phi', 'Chi phí nhập và doanh thu'], ['nhan-vien', 'Theo nhân viên']] },
];

// Danh sách phẳng: [{ ma, nhan, cha }] (cha = mã trang cha nếu là tab, ngược lại null)
const DANH_SACH = CAU_TRUC.flatMap(t => [
  { ma: t.ma, nhan: t.tab ? `${t.nhan} (cả trang)` : t.nhan, cha: null },
  ...(t.tab ?? []).map(([k, nhan]) => ({ ma: `${t.ma}/${k}`, nhan: `${t.nhan} › ${nhan}`, cha: t.ma })),
]);

const MA_HOP_LE = new Set(DANH_SACH.map(t => t.ma));
const laMaHopLe = ma => MA_HOP_LE.has(ma);

module.exports = { CAU_TRUC, DANH_SACH, laMaHopLe };
