// build_srs.js – sinh file Word "Đặc tả yêu cầu chức năng" (mỗi chức năng có sơ đồ vào/ra + bảng đặc tả dạng form)
// Chạy (từ thư mục docs/srs):  python3 ve_so_do.py && node build_srs.js      (cần: npm i docx)
// Dữ liệu: du_lieu/*.json   Sơ đồ: so_do/*.png   Kết quả: ../Dac_ta_yeu_cau_chuc_nang.docx
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ImageRun,
  ShadingType, BorderStyle, AlignmentType, HeadingLevel, LevelFormat, PageOrientation,
  Footer, PageNumber,
} = require('docx');

const DIR = __dirname;
const OUT = path.join(DIR, '..', 'Dac_ta_yeu_cau_chuc_nang.docx');
const W = 14678; // độ rộng nội dung (A4 ngang, lề 0.75")
const FONT = 'Arial';

// ---------- helpers ----------
function runs(text, opts = {}) {
  return String(text).split('`').map((seg, i) => ({ seg, i })).filter(x => x.seg !== '')
    .map(({ seg, i }) => new TextRun({ text: seg, font: i % 2 ? 'Consolas' : FONT, ...opts }));
}
const para = (text, opts = {}, pOpts = {}) => new Paragraph({ spacing: { after: 100 }, children: runs(text, opts), ...pOpts });
const bullet = text => new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 60 }, children: runs(text) });
const h1 = (t, extra = {}) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 140 }, children: [new TextRun({ text: t, font: FONT })], ...extra });
const h2 = (t, extra = {}) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 }, children: [new TextRun({ text: t, font: FONT })], ...extra });
const gap = () => new Paragraph({ spacing: { after: 120 }, children: [] });
const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
const borders = { top: border, bottom: border, left: border, right: border };

function cell(content, width, { header = false, label = false, size = 18 } = {}) {
  const items = Array.isArray(content) ? content : String(content).split('\n');
  const fill = header ? 'D9E2F3' : label ? 'F2F2F2' : undefined;
  return new TableCell({
    width: { size: width, type: WidthType.DXA }, borders,
    shading: fill ? { fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    children: items.map(l => (l instanceof Paragraph) ? l
      : new Paragraph({ spacing: { after: 30 }, children: runs(l, { size, bold: header || label }) })),
  });
}
function table(headers, rows, widths) {
  if (widths.reduce((a, b) => a + b, 0) !== W) throw new Error('Tổng cột != ' + W);
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((h, i) => cell(h, widths[i], { header: true })) }),
      ...rows.map(r => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, widths[i])) })),
    ],
  });
}
const li = (t, size = 18) => new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 30 }, children: runs(t, { size }) });
const num = (t, size = 18) => new Paragraph({ spacing: { after: 40 }, children: runs(t, { size }) });

function image(file, wPx = 920) {
  const buf = fs.readFileSync(path.join(DIR, 'so_do', file));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20); // kích thước PNG
  return new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, keepNext: true,
    children: [new ImageRun({ type: 'png', data: buf, transformation: { width: wPx, height: Math.round(wPx * h / w) },
      altText: { title: file, description: 'Sơ đồ vào/ra của chức năng ' + file.replace('.png', ''), name: file } })],
  });
}

// ---------- dữ liệu ----------
const meta = JSON.parse(fs.readFileSync(path.join(DIR, 'du_lieu', '00_meta.json'), 'utf8'));
const mods = meta.modules.map(m => ({
  ...m, fns: JSON.parse(fs.readFileSync(path.join(DIR, 'du_lieu', m.file), 'utf8')),
}));
const all = mods.flatMap(m => m.fns);
const DEF_VAO = 'Bàn phím, chuột (giao diện web)';
const DEF_RA = 'Màn hình trình duyệt';

const errs = [
  ['400', 'Dữ liệu đầu vào sai hoặc thiếu'],
  ['401', 'Chưa đăng nhập hoặc token hết hạn'],
  ['403', 'Không đủ quyền'],
  ['404', 'Không tồn tại'],
  ['409', 'Xung đột nghiệp vụ (trùng dữ liệu, sai trạng thái, đang được tham chiếu, không đủ nguyên liệu)'],
];
const perm = [
  ['POS (order, thanh toán)', '✓', '✓', '✓'],
  ['Khách hàng', '✓', '✓', '✓ (tạo, tìm)'],
  ['Sản phẩm, danh mục, công thức', '✓', '✓', '✗'],
  ['Khuyến mãi', '✓', '✓', '✗'],
  ['Kho, nhập hàng, nhà cung cấp', '✓', '✓', '✗'],
  ['Nhân sự, phân công', '✓', '✓ (không đổi quyền, mật khẩu, không sửa admin)', 'xem lịch của mình'],
  ['Tạo, xóa nhân viên và tài khoản', '✓', '✗', '✗'],
  ['Báo cáo', '✓', '✓', '✗'],
];

// ---------- một chức năng ----------
function chucNang(fn, first) {
  const out = [];
  out.push(h2(`${fn.id} – ${fn.ten}`, { pageBreakBefore: true, keepNext: true }));
  out.push(new Paragraph({ spacing: { after: 60 }, keepNext: true, children: [
    ...runs('Quyền hạn: ', { bold: true, size: 20 }), ...runs(fn.quyen + '     ', { size: 20 }),
    ...runs('API: ', { bold: true, size: 20 }), ...runs('`' + fn.api + '`', { size: 18 }),
  ] }));
  out.push(new Paragraph({ spacing: { after: 60 }, keepNext: true, children: runs(fn.mo_ta, { size: 20, italics: true }) }));
  out.push(image(fn.id + '.png'));

  const L = 2700, R = W - L;
  const row = (label, content) => new TableRow({ cantSplit: true, children: [cell(label, L, { label: true }), cell(content, R)] });
  const list = a => a.map(x => li(x));
  const rows = [
    row('Mô tả', fn.mo_ta),
    row('Quyền hạn', fn.quyen),
    row('Giao diện API', fn.api),
    row('Đầu vào', [num('Thiết bị: ' + (fn.tb_vao || DEF_VAO)), num('Dữ liệu:'), ...list(fn.dl_vao)]),
    row('Dữ liệu độc lập (đọc từ CSDL)', list(fn.dl_doc)),
    row('Xử lý – hệ thống phải', fn.xu_ly.map((t, i) => num(`${fn.id}.${i + 1}  ${t}`))),
    row('Đầu ra', [num('Thiết bị: ' + (fn.tb_ra || DEF_RA)), num('Dữ liệu:'), ...list(fn.dl_ra)]),
    row('Dữ liệu lưu xuống CSDL', list(fn.dl_luu)),
    row('Tiền điều kiện', fn.tien),
    row('Hậu điều kiện', fn.hau),
    row('Tác dụng phụ', fn.phu),
    row('Mã lỗi thường gặp', fn.loi),
  ];
  out.push(new Paragraph({ pageBreakBefore: true, spacing: { after: 100 }, keepNext: true,
    children: [new TextRun({ text: `${fn.id} – ${fn.ten}: bảng đặc tả`, font: FONT, bold: true, size: 22, color: '2F5597' })] }));
  out.push(new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [L, R], rows }));
  return out;
}

// ---------- nội dung ----------
const children = [
  new Paragraph({ spacing: { before: 200, after: 80 }, children: [new TextRun({ text: 'ĐẶC TẢ YÊU CẦU CHỨC NĂNG', font: FONT, bold: true, size: 44, color: '1F3864' })] }),
  new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'Hệ thống quản lý quán cà phê', font: FONT, size: 30, color: '404040' })] }),
  new Paragraph({ spacing: { after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '1F3864', space: 4 } },
    children: [new TextRun({ text: `${all.length} yêu cầu chức năng, mỗi chức năng có sơ đồ vào/ra và bảng đặc tả dạng form`, font: FONT, size: 20, italics: true, color: '595959' })] }),

  h1('1. Giới thiệu'),
  h2('1.1 Mục đích'),
  para('Tài liệu đặc tả từng yêu cầu chức năng của hệ thống quản lý quán cà phê: dữ liệu vào, dữ liệu độc lập đọc từ cơ sở dữ liệu, cách xử lý, dữ liệu ra và dữ liệu lưu xuống cơ sở dữ liệu. Cách trình bày theo dạng đặc tả có cấu trúc (form-based specification): mỗi chức năng có một sơ đồ và một bảng gồm chức năng, mô tả, đầu vào, đầu ra, xử lý, tiền điều kiện, hậu điều kiện và tác dụng phụ.'),
  h2('1.2 Phạm vi'),
  bullet('Mô hình vận hành: khách uống tại quán, nhân viên nhập order vào hệ thống (không có quản lý bàn).'),
  bullet(`Hệ thống gồm 8 nhóm chức năng với ${all.length} yêu cầu: ` + mods.map(m => `${m.ma} (${m.fns.length})`).join(', ') + '.'),
  bullet('Công nghệ: backend Node.js (Express, SQL thuần qua mysql2), cơ sở dữ liệu MySQL/MariaDB trên XAMPP, frontend React (Vite). Các bảng nêu trong tài liệu đúng theo `database/schema.sql`.'),
  bullet('Các API trong tài liệu đã được cài đặt ở backend và có kiểm thử tự động. Giao diện web (frontend) đang xây dựng nên phần thiết bị vào/ra là giao diện dự kiến.'),
  h2('1.3 Cách đọc sơ đồ của từng chức năng'),
  para('Mỗi chức năng có một sơ đồ cùng bố cục: hình ê-líp ở giữa là chức năng cần xử lý, bên trái là những gì đi vào, bên phải là những gì đi ra, thanh DATABASE ở dưới là cơ sở dữ liệu.'),
  image('_mau.png', 760),
  table(['Thành phần', 'Ý nghĩa'], [
    ['Thiết bị đầu vào', 'Thiết bị người dùng dùng để nhập (bàn phím, chuột, màn hình cảm ứng).'],
    ['Dữ liệu đầu vào', 'Các trường người dùng nhập hoặc gửi kèm (đường dẫn, query, body). Dấu `?` sau tên trường = không bắt buộc.'],
    ['Dữ liệu độc lập', 'Dữ liệu đã có sẵn trong CSDL mà chức năng phải đọc để xử lý (mũi tên "đọc" từ DATABASE).'],
    ['Xử lý (chức năng)', 'Hình ê-líp ở giữa. Dòng "Xử lý:" dưới sơ đồ tóm tắt công thức tính toán và điều kiện so sánh; chi tiết nằm ở mục "Xử lý" trong bảng đặc tả.'],
    ['Thiết bị đầu ra', 'Nơi hiển thị kết quả (màn hình trình duyệt, máy in hóa đơn).'],
    ['Dữ liệu đầu ra', 'Kết quả trả về cho người dùng.'],
    ['Dữ liệu lưu xuống CSDL', 'Bảng và cột được thêm, sửa hoặc xóa (mũi tên "ghi" xuống DATABASE).'],
  ], [3200, 11478]),
  gap(),
  h2('1.4 Quy ước chung'),
  bullet('Mọi yêu cầu trong tài liệu là bắt buộc, viết dưới dạng "hệ thống phải ...". Các yêu cầu được đánh số `ID.n` (ví dụ `POS-02.3`) để truy vết.'),
  bullet('Ký hiệu quyền: A = admin, Q = quản lý, N = nhân viên (lưu ở `TaiKhoan.quyen_truy_cap`).'),
  bullet('Mọi API (trừ AUTH-01) yêu cầu header `Authorization: Bearer <token>`.'),
  bullet('Thành công: `{ "ok": true, "data": ... }`. Lỗi: `{ "ok": false, "loi": "MA_LOI", "thong_bao": "..." }`.'),
  bullet('Danh sách có phân trang: đầu vào thêm `trang`, `moi_trang`; đầu ra thêm `tong_so_ban_ghi`.'),
  bullet('Tồn kho không được âm. Không đủ nguyên liệu để pha món: HTTP 409, `loi = "KHONG_DU_NGUYEN_LIEU"`, kèm `chi_tiet[]: {ten_nguyen_lieu, don_vi_tinh, so_luong_ton, can_dung, con_thieu}`.'),
  bullet('Quy tắc kho: TRỪ NGAY khi gọi món (tạo order, thêm món, tăng số lượng). Bỏ ly chưa làm (xóa dòng, giảm số lượng, hủy order) thì HOÀN nguyên liệu; ly đã làm thì nguyên liệu vẫn bị trừ, nhân viên chọn số ly đã làm bằng `da_lam` (mặc định 0). Order `da_phuc_vu` coi như làm xong hết. Thanh toán không đụng kho.'),
  bullet('Biên lai thanh toán lưu ở bảng `HoaDonDaThanhToan` (chỉ thêm, trigger chặn sửa và xóa); báo cáo và lịch sử mua đọc từ bảng này, lọc theo NGÀY THANH TOÁN.'),
  gap(),
  h2('Mã lỗi HTTP'),
  table(['Mã', 'Ý nghĩa'], errs, [3000, 11678]),

  h1('2. Tổng quan chức năng', { pageBreakBefore: true }),
  h2('2.1 Phân quyền'),
  table(['Chức năng', 'admin', 'quan_ly', 'nhan_vien'], perm, [5000, 2600, 4278, 2800]),
  gap(),
  h2('2.2 Danh sách yêu cầu chức năng'),
  table(['ID', 'Tên chức năng', 'Quyền hạn', 'Giao diện API'],
    all.map(f => [f.id, f.ten, f.quyen, f.api]), [1100, 4300, 3500, 5778]),
];

mods.forEach((m, mi) => {
  children.push(h1(`${3 + mi}. ${m.ten} (${m.ma})`, { pageBreakBefore: true }));
  children.push(para(`Nhóm ${m.ma} gồm ${m.fns.length} yêu cầu. Mỗi yêu cầu trình bày trên các trang tiếp theo: tiêu đề, sơ đồ vào/ra, rồi bảng đặc tả.`));
  children.push(table(['ID', 'Tên chức năng', 'Quyền hạn', 'Giao diện API'],
    m.fns.map(f => [f.id, f.ten, f.quyen, f.api]), [1100, 4300, 3500, 5778]));
  m.fns.forEach((fn, i) => {
    // trang đầu của nhóm: chức năng đầu tiên ngắt trang sau tiêu đề nhóm
    children.push(...chucNang(fn, i === 0));
  });
});

children.push(h1(`${3 + mods.length}. Phụ lục – Truy vết chức năng và bảng CSDL`, { pageBreakBefore: true }));
children.push(para('Mỗi chức năng đọc (Đ) hoặc ghi (G) những bảng sau. Thông tin lấy từ phần "Dữ liệu độc lập" và "Dữ liệu lưu xuống CSDL" của từng chức năng.'));
const tables = ['DanhMuc', 'SanPham', 'HoaDon', 'ChiTietHoaDon', 'ChiTietHoaDonKhuyenMai', 'HoaDonDaThanhToan', 'KhuyenMai', 'KhuyenMaiSanPham',
  'KhachHang', 'NguyenLieu', 'CongThuc', 'NhaCungCap', 'PhieuNhap', 'ChiTietNhap', 'NhanVien', 'TaiKhoan', 'CaLamViec', 'PhanCong'];
const touch = (arr, t) => arr.some(x => new RegExp('(^|[^A-Za-z])' + t + '([^A-Za-z]|$)').test(x));
const trace = tables.map(t => {
  const d = all.filter(f => touch(f.dl_doc, t)).map(f => f.id);
  const g = all.filter(f => touch(f.dl_luu, t)).map(f => f.id);
  return [t, d.join(', ') || '–', g.join(', ') || '–'];
});
children.push(table(['Bảng', 'Đọc (Đ)', 'Ghi (G)'], trace, [2600, 6039, 6039]));

const doc = new Document({
  creator: 'Nhóm đồ án', title: 'Đặc tả yêu cầu chức năng – Hệ thống quản lý quán cà phê',
  styles: {
    default: { document: { run: { font: FONT, size: 20 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 32, bold: true, font: FONT, color: '1F3864' }, paragraph: { outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, font: FONT, color: '2F5597' }, paragraph: { outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { top: 1080, bottom: 1000, left: 1080, right: 1080 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ text: 'Đặc tả yêu cầu chức năng – Hệ thống quản lý quán cà phê – trang ', font: FONT, size: 16, color: '7F7F7F' }),
      new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: '7F7F7F' })] })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => { fs.writeFileSync(OUT, buf); console.log('Đã ghi', OUT, '(' + Math.round(buf.length / 1024) + ' KB)'); });
