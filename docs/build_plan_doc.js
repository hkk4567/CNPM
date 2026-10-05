// build_plan_doc.js – sinh file Word "Kế hoạch phát triển Agile (Scrum + XP)"
// Chạy: node build_plan_doc.js   (cần: npm i docx)
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
  ShadingType, BorderStyle, AlignmentType, HeadingLevel, LevelFormat,
  PageOrientation, Footer, PageNumber,
} = require('docx');

const OUT = path.join(__dirname, 'Ke_hoach_Agile_quan_ca_phe.docx');
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

function cell(text, width, { header = false, size = 18, fill } = {}) {
  const lines = String(text).split('\n');
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    shading: header ? { fill: 'D9E2F3', type: ShadingType.CLEAR, color: 'auto' }
      : fill ? { fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
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

// ---------- dữ liệu ----------
const roles = [
  ['Development team (≤ 7 người)', '4 thành viên tự tổ chức, ai cũng làm cả backend lẫn giao diện; chia hai cặp làm song song (Cặp A, Cặp B), đảo cặp mỗi sprint'],
  ['Product Owner', 'Một thành viên nắm nghiệp vụ quán cà phê, quyết định thứ tự ưu tiên. Giảng viên đóng vai khách hàng ở buổi review'],
  ['ScrumMaster', 'Luân phiên mỗi sprint, lo nhịp họp và gỡ vướng (không phải trưởng nhóm)'],
  ['Product backlog', 'Bảng ở mục 4, lấy ID từ file đặc tả `Dac_ta_tinh_nang_quan_ly_quan_ca_phe.docx`'],
  ['Sprint', '1 tuần; mỗi sprint kết thúc bằng một bản chạy được (potentially shippable increment)'],
  ['Daily Scrum', '15 phút mỗi ngày: hôm qua làm gì, vướng gì, hôm nay làm gì'],
  ['Sprint review', 'Cuối sprint demo cho PO và giảng viên'],
  ['Retrospective', 'Khoảng 20 phút cuối sprint (slide không có, nhưng thường đi kèm Scrum)'],
  ['Velocity', 'Đo sau mỗi sprint bằng số điểm hoàn thành thật, dùng để chỉnh sprint kế tiếp'],
];

const schedule = [
  ['S1 (gồm Sprint 0, 2 ngày dựng nền)', '05–11/10', 'Đăng nhập, xem menu, nhập order, xem danh sách order', '24'],
  ['S2', '12–18/10', 'Sửa/hủy order, thanh toán, in bill, gắn khách thành viên, tích điểm', '28'],
  ['S3', '19–25/10', 'Khuyến mãi theo sản phẩm tự áp vào order; quản lý kho và nhập hàng', '32'],
  ['S4', '26/10–01/11', 'Bán thì kho tự trừ; nhân sự, ca làm, phân công; phân quyền đầy đủ', '29'],
  ['S5 (pha kết thúc)', '02–05/11', 'Báo cáo, sửa lỗi, refactor, tài liệu, chuẩn bị demo', '21'],
  ['Đệm', '06–07/11', 'Chỉ để xử lý sự cố trước giờ nộp', '–'],
];

const alloc = [
  ['S1', 'AUTH-01 (3), middleware phân quyền (3), SP-01 CRUD sản phẩm/danh mục (5)', 'POS-01 (2), POS-02 (8), POS-10 (3)', '24'],
  ['S2', 'POS-03/04/05 (5), POS-07 (2), POS-09 (2), POS-08 (5), cộng điểm (2)', 'POS-11 (3), KH-01 (2), KH-03 (2), POS-06 (2), KH-02/04 (3)', '28'],
  ['S3', 'KM-01…KM-06 (10), áp khuyến mãi vào POS (5), KM-07 (3)', 'KHO-01…KHO-05 (14)', '32'],
  ['S4', 'Trừ kho trong POS-08 (5), KHO-06 (3), KH-05 (2), AUTH-02 (2)', 'NS-01…NS-07 (17)', '29'],
  ['S5', 'BC-01…BC-04 (8)', 'BC-05, BC-06 (5)', '13'],
  ['S5 (cả nhóm)', 'Refactor, cập nhật ERD và đặc tả, hướng dẫn sử dụng, chuẩn bị demo', '', '8'],
];

const backlog = [
  ['Nền tảng', 'AUTH-01 đăng nhập; middleware phân quyền A/Q/N', '3 + 3'],
  ['Sản phẩm', 'SP-01 CRUD sản phẩm và danh mục (đặc tả chưa có, thêm mới)', '5'],
  ['POS', 'POS-01 xem menu; POS-02 tạo order; POS-10 danh sách order', '2 + 8 + 3'],
  ['POS', 'POS-03/04/05 thêm/sửa/xóa dòng; POS-07 đổi trạng thái; POS-09 hủy; POS-11 in bill', '5 + 2 + 2 + 3'],
  ['Thanh toán', 'POS-08 thanh toán; cộng điểm; trừ kho', '5 + 2 + 5'],
  ['Khách hàng', 'KH-01, KH-03, POS-06 gắn khách; KH-02, KH-04; KH-05 top khách', '2 + 2 + 2 + 3 + 2'],
  ['Khuyến mãi', 'KM-01…KM-06; áp khuyến mãi tự động vào POS; KM-07 báo cáo', '10 + 5 + 3'],
  ['Kho', 'KHO-01…KHO-05; KHO-06 cảnh báo', '14 + 3'],
  ['Nhân sự', 'NS-01…NS-07; AUTH-02 đổi mật khẩu', '17 + 2'],
  ['Báo cáo', 'BC-01…BC-06', '13'],
  ['Hoàn thiện', 'Refactor, tài liệu, chuẩn bị demo', '8'],
];

const gates = [
  ['Cuối S1 (11/10)', 'Hoàn thành ít nhất 18 trên 24 điểm', 'Nếu thấp hơn: họp ngay, xét giảm xuống bản tối giản hoặc trao đổi lại phạm vi với giảng viên'],
  ['Cuối S2 (18/10)', 'Tích lũy ít nhất 39 trên 52 điểm', 'Nếu thấp hơn: như trên; tính lại velocity để chia lại S3–S5'],
  ['Cuối S3 (25/10)', 'Khuyến mãi và kho chạy được trên dữ liệu thật', 'Nếu chưa: không mở thêm module mới ở S4 cho đến khi sửa xong'],
];

const thin = [
  ['Báo cáo', 'Endpoint trả dữ liệu dạng bảng, chưa cần biểu đồ'],
  ['Khuyến mãi', 'Mỗi sản phẩm áp một khuyến mãi tốt nhất, không cộng dồn'],
  ['Nhân sự', 'Lịch tuần hiển thị dạng bảng, chặn trùng nhờ khóa chính của `PhanCong`'],
  ['CRUD (SP-01, KHO-01/02, NS-04)', 'Dùng chung một khung CRUD làm một lần ở S1'],
  ['Giao diện', 'Đơn giản, ưu tiên chạy đúng nghiệp vụ'],
];

const risks = [
  ['Khách hàng/PO ít thời gian (slide 27, 52)', 'Cố định buổi review cuối mỗi sprint; PO chốt thứ tự ưu tiên khi nhóm bất đồng'],
  ['Khó ưu tiên thay đổi (slide 52)', 'Mọi thay đổi đi vào backlog; PO quyết ở buổi lập kế hoạch sprint, không chen ngang sprint đang chạy'],
  ['Thiếu tài liệu, khó bảo trì (slide 49–50)', 'Dùng ERD và file đặc tả làm tài liệu sống, cập nhật cùng story'],
  ['Test không đủ bao phủ (slide 30)', 'Review test trong sprint review; ưu tiên test cho nghiệp vụ tiền, kho, khuyến mãi'],
  ['Kiến thức dồn vào một người (slide 32)', 'Đảo cặp mỗi sprint để ai cũng từng làm mọi module'],
  ['Trượt tiến độ do khối lượng lớn', 'Cổng kiểm tra ở mục 6, bản tối giản ở mục 5'],
];

const uncertain = [
  'Các con số điểm là ước lượng của người lập kế hoạch, chưa kiểm chứng. Velocity thật chỉ biết sau S1.',
  'Trung bình khoảng 27 điểm mỗi tuần. Mức giả định ban đầu chỉ khoảng 12 điểm mỗi tuần, nên rủi ro cao.',
  'S5 chỉ có 4 ngày mà gánh 21 điểm; hai ngày đệm 06–07/11 là phần dự phòng duy nhất.',
  'Chưa tính thời gian học công nghệ nếu nhóm dùng stack mới.',
  'Nếu nhóm không đủ 4 người làm song song hai cặp, tiến độ sẽ chậm hơn nhiều so với bảng.',
  'Sprint 1 tuần lệch khỏi slide (slide nói 2–4 tuần); chọn vậy để đo velocity sớm.',
];

// ---------- nội dung ----------
const children = [
  new Paragraph({ spacing: { before: 200, after: 80 },
    children: [new TextRun({ text: 'KẾ HOẠCH PHÁT TRIỂN AGILE', font: FONT, bold: true, size: 44, color: '1F3864' })] }),
  new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: 'Hệ thống quản lý quán cà phê (Scrum + XP)', font: FONT, size: 30, color: '404040' })] }),
  new Paragraph({ spacing: { after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '1F3864', space: 4 } },
    children: [new TextRun({ text: 'Dựa trên Chương 3 – Agile Software Development; thời hạn nộp khoảng 07/11/2026; làm đủ toàn bộ chức năng trong đặc tả', font: FONT, size: 20, italics: true, color: '595959' })] }),

  h1('1. Bối cảnh và giả định'),
  bullet('Phạm vi: toàn bộ chức năng trong file đặc tả (134 điểm), không hoãn module nào.'),
  bullet('Nhóm 4 người; thứ Hai 05/10/2026 là ngày bắt đầu; hạn nộp khoảng 07/11/2026 (khoảng 5 tuần).'),
  bullet('Sprint dài 1 tuần (lệch khỏi slide: 2–4 tuần) để đo velocity sớm và điều chỉnh kịp.'),
  bullet('Tài liệu liên quan: ERD đã chốt (có `ma_chi_tiet` trong `ChiTietHoaDon`), và đặc tả đầu vào/đầu ra từng tính năng.'),

  h1('2. Áp dụng khung Scrum'),
  table(['Khái niệm trong slide', 'Áp dụng cho dự án'], roles, [4200, 10478]),

  h1('3. Ba pha của Scrum'),
  bullet('Pha lập kế hoạch tổng quan (Sprint 0, 2 ngày đầu tuần 1): kho mã nguồn, quy ước nhánh/commit; tạo CSDL từ ERD đã chốt (gồm `ChiTietHoaDon.ma_chi_tiet`, `NguyenLieu.muc_ton_toi_thieu`, `NhanVien.trang_thai`), thêm index và UNIQUE; dữ liệu mẫu; khung API và khung test; CI chạy toàn bộ test mỗi lần push.'),
  bullet('Pha sprint: S1 đến S4 phát triển tính năng, S5 làm báo cáo và hoàn thiện.'),
  bullet('Pha kết thúc: hoàn thiện tài liệu (ERD, đặc tả, hướng dẫn sử dụng), rút kinh nghiệm.'),

  h1('4. Product backlog (tổng 134 điểm, ước lượng ban đầu)'),
  table(['Epic', 'Story (ID đặc tả)', 'Điểm'], backlog, [2400, 10878, 1400]),
  gap(),
  para('Thứ tự phụ thuộc đã kiểm: khuyến mãi áp vào POS sau khi POS xong (S2 sang S3); trừ kho sau khi có công thức (S3 sang S4); BC-05 sau khi có dữ liệu nhập kho (S3).'),

  h1('5. Lịch và phân bổ sprint'),
  h2('5.1 Lịch'),
  table(['Sprint', 'Thời gian', 'Mục tiêu demo được', 'Điểm'], schedule, [2400, 2600, 8078, 1600]),
  h2('5.2 Phân bổ story cho hai cặp làm song song'),
  table(['Sprint', 'Cặp A', 'Cặp B', 'Điểm'], alloc, [1600, 5600, 5778, 1700]),
  gap(),
  para('Tổng: 24 + 28 + 32 + 29 + 21 = 134 điểm. Mỗi sprint đảo cặp để kiến thức không dồn vào một người.'),

  h1('6. Cách để vừa tiến độ'),
  h2('6.1 Bản tối giản cho mỗi chức năng (vẫn tính là "làm xong")'),
  table(['Chức năng', 'Mức tối giản'], thin, [3500, 11178]),
  h2('6.2 Cổng kiểm tra (ngưỡng 75% là đề xuất)'),
  table(['Mốc', 'Điều kiện', 'Hành động'], gates, [2400, 5000, 7278]),

  h1('7. Thực hành XP áp dụng'),
  bullet('User story và task: mỗi dòng trong backlog là một story; đầu sprint chia thành task nhỏ.'),
  bullet('Test-first: viết test API trước cho logic quan trọng: thanh toán, trừ kho, khuyến mãi. Giao diện khó viết unit test nên kiểm tra thủ công.'),
  bullet('Pair programming: ghép cặp cho POS-08 và trừ kho vì là transaction nhiều bảng dễ sai.'),
  bullet('Continuous integration: merge sớm, mỗi lần merge chạy toàn bộ test.'),
  bullet('Refactoring liên tục: dành khoảng 10% mỗi sprint thay vì dồn đến S5.'),
  bullet('Sustainable pace: không thức đêm dồn việc; làm thêm giờ nhiều làm giảm chất lượng.'),
  gap(),
  h2('Definition of Done cho mỗi story'),
  bullet('Code đã merge vào nhánh chính.'),
  bullet('Test mới và test cũ đều qua.'),
  bullet('Chạy được trên bản demo.'),
  bullet('ERD và đặc tả được cập nhật nếu có thay đổi.'),

  h1('8. Rủi ro và cách xử lý'),
  table(['Rủi ro (nguồn trong slide)', 'Biện pháp'], risks, [5200, 9478]),

  h1('9. Điểm chưa chắc'),
  ...uncertain.map(bullet),
];

const doc = new Document({
  creator: 'Kazana',
  title: 'Kế hoạch phát triển Agile – quản lý quán cà phê',
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
      children: [new TextRun({ text: 'Kế hoạch Agile – quản lý quán cà phê – Trang ', font: FONT, size: 16, color: '7F7F7F' }),
        new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: '7F7F7F' })] })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf);
  console.log('Đã tạo:', OUT);
});
