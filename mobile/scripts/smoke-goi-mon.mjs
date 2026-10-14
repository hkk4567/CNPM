// Kiểm thử giao diện Gọi món / Order trên bản web (expo export --platform web), API giả lập có trạng thái.
// Chạy: npm run build-web && PW_DIR=<thư mục có playwright> node scripts/smoke-goi-mon.mjs
import { khoiDong } from './lib-smoke.mjs';
import { caiGia, goi } from './mock-api.mjs';

const { trang, kiem, chup, gia, ketThuc, URL_APP } = await khoiDong({ cong: 4175, tienTo: 'gm-' });

await caiGia(gia);

const chu = async () => trang.locator('body').innerText();
const coChu = async (t) => (await chu()).includes(t);
const nut = (ten, opt = {}) => trang.getByRole('button', { name: ten, exact: true, ...opt });
const luu = () => goi[goi.length - 1];

try {
  await trang.goto(URL_APP);
  await trang.getByLabel('Tên đăng nhập').fill('an');
  await trang.getByLabel('Mật khẩu', { exact: true }).fill('matkhau1');
  await trang.getByRole('button', { name: 'Đăng nhập' }).click();
  await trang.getByText('Cà phê sữa').first().waitFor();

  // 1. Menu
  kiem('menu có 4 món', ['Cà phê sữa', 'Trà đào', 'Bạc xỉu', 'Bánh mì'].every((x) => true) && (await coChu('Bánh mì')) && (await coChu('Bạc xỉu')));
  kiem('món giảm giá hiện giá sau giảm 26.000đ và giá gốc 29.000đ', (await coChu('26.000đ')) && (await coChu('29.000đ')));
  kiem('món hết nguyên liệu hiện chip, không có nút thêm', (await coChu('Hết nguyên liệu')) && (await nut('Thêm Bánh mì').count()) === 0);
  kiem('món gần hết hiện "Còn 2 ly"', await coChu('Còn 2 ly'));
  await chup('01-menu');
  await trang.getByLabel('Tìm món').fill('ca phe');
  kiem('tìm không dấu "ca phe" -> chỉ còn Cà phê sữa', (await coChu('Cà phê sữa')) && !(await coChu('Trà đào')));
  await trang.getByLabel('Tìm món').fill('');
  await nut('Trà').click();
  kiem('lọc danh mục Trà', (await coChu('Trà đào')) && !(await coChu('Bạc xỉu')));
  await nut('Tất cả').click();

  // 2. Chọn món
  await nut('Thêm Cà phê sữa').click();
  await nut('Tăng Cà phê sữa').click();
  await nut('Thêm Trà đào').click();
  await nut('Tăng Trà đào').click();
  kiem('Trà đào chỉ còn 2 ly -> nút tăng bị khóa ở 2', await nut('Tăng Trà đào').isDisabled());
  await nut('Giảm Trà đào').click();
  await trang.getByRole('button', { name: /^Xem giỏ/ }).waitFor();
  kiem('thanh giỏ: 3 ly · 87.000đ (2×26.000 + 35.000)', (await trang.getByRole('button', { name: 'Xem giỏ · 3 ly · 87.000đ' }).count()) === 1);
  await chup('02-menu-co-gio');

  // 3. Giỏ
  await trang.getByRole('button', { name: /^Xem giỏ/ }).click();
  await trang.getByText('Giỏ gọi món').waitFor();
  await trang.getByLabel('Ghi chú').first().fill('ít đá');
  kiem('giỏ hiện 2 dòng và tạm tính', (await coChu('Cà phê sữa')) && (await coChu('Trà đào')) && (await coChu('87.000đ')));
  await chup('03-gio-hang');
  await nut('Gửi order').click();
  await trang.getByText('Order #1').first().waitFor();
  kiem('POST /hoa-don gửi đúng món, số lượng, ghi chú', JSON.stringify(goi[0].body) === JSON.stringify({ items: [{ ma_san_pham: 1, so_luong: 2, ghi_chu: 'ít đá' }, { ma_san_pham: 2, so_luong: 1, ghi_chu: null }], ma_khach_hang: null }), JSON.stringify(goi[0].body));
  kiem('chi tiết: dòng, ghi chú, khuyến mãi, tạm tính', (await coChu('2 × Cà phê sữa')) && (await coChu('Ghi chú: ít đá')) && (await coChu('Giảm 3k cà phê')) && (await coChu('Tạm tính')) && (await coChu('87.000đ')));
  kiem('cảnh báo kho hiện sau khi gửi', await coChu('Sắp hết nguyên liệu: Đào ngâm (còn 0 g)'));
  kiem('đang pha chế: có nút Thêm món / Đã phục vụ / Hủy order', (await nut('Thêm món').count()) === 1 && (await nut('Đã phục vụ').count()) === 1 && (await nut('Hủy order').count()) === 1);
  await chup('04-chi-tiet-order');

  // 4. Bớt số ly: hỏi đã pha mấy ly (đang pha chế)
  await nut('Cà phê sữa x2').click();
  await nut('Giảm Cà phê sữa').click();
  await nut('Lưu').click();
  await trang.getByText('Bớt số ly').waitFor();
  await trang.waitForTimeout(400);
  await chup('05-hoi-da-lam');
  await nut('Tăng Cà phê sữa: đã pha xong').click();
  await nut('Bớt').click();
  await trang.getByText('1 × Cà phê sữa').waitFor();
  kiem('bớt 1 ly, đã pha 1 -> PATCH {so_luong:1, da_lam:1}', JSON.stringify(luu().body) === JSON.stringify({ so_luong: 1, da_lam: 1 }), JSON.stringify(luu().body));
  // tăng số ly: không hỏi
  await nut('Cà phê sữa x1').click();
  await nut('Tăng Cà phê sữa').click(); await nut('Tăng Cà phê sữa').click();
  await nut('Lưu').click();
  await trang.getByText('3 × Cà phê sữa').waitFor();
  kiem('tăng lên 3 ly -> PATCH {so_luong:3}, không hỏi đã pha', JSON.stringify(luu().body) === JSON.stringify({ so_luong: 3 }), JSON.stringify(luu().body));

  // 5. Gắn khách
  await nut('Gắn khách').click();
  await trang.getByLabel('Số điện thoại').fill('123');
  await nut('Gắn khách').last().click();
  kiem('SĐT sai định dạng -> báo ngay, chưa gọi máy chủ', (await coChu('Số điện thoại gồm 10 chữ số và bắt đầu bằng 0')) && luu().p.endsWith('/dong/101'));
  await trang.getByLabel('Số điện thoại').fill('0900000000');
  await nut('Gắn khách').last().click();
  await trang.getByText('Chưa có khách hàng với số điện thoại này').waitFor();
  kiem('SĐT chưa đăng ký -> hiện thông báo của máy chủ', true);
  await trang.getByLabel('Số điện thoại').fill('0912345678');
  await nut('Gắn khách').last().click();
  await trang.getByText('Nguyễn Thị Hoa').waitFor();
  kiem('gắn khách thành công, nút đổi thành "Đổi khách"', (await nut('Đổi khách').count()) === 1);
  await chup('06-gan-khach');

  // 6. Thêm món vào order đang mở
  await nut('Thêm món').click();
  await trang.getByText('Đang thêm món vào Order #1').waitFor();
  kiem('menu báo đang thêm vào Order #1', true);
  await nut('Thêm Bạc xỉu').click();
  await trang.getByRole('button', { name: 'Xem giỏ · 1 ly · 32.000đ' }).click();
  await trang.getByText('Thêm vào Order #1').waitFor();
  await nut('Thêm vào order').click();
  await trang.getByText('1 × Bạc xỉu').waitFor();
  kiem('POST /hoa-don/1/dong đúng món', luu().p === '/hoa-don/1/dong' && luu().body.ma_san_pham === 3 && luu().body.so_luong === 1, JSON.stringify(luu()));

  // 7. Xóa dòng (đang pha chế -> hỏi đã pha)
  await nut('Bạc xỉu x1').click();
  await nut('Xóa món khỏi order').click();
  await trang.getByText('Ly đã pha xong thì nguyên liệu vẫn bị trừ', { exact: false }).first().waitFor();
  await nut('Xóa món').click();
  await trang.getByText('1 × Bạc xỉu').waitFor({ state: 'detached' });
  kiem('xóa dòng chưa pha -> DELETE không có da_lam', luu().m === 'DELETE' && luu().query === '', JSON.stringify(luu()));

  // 8. Đã phục vụ
  await nut('Đã phục vụ').click();
  await trang.getByText('Đã phục vụ?').waitFor();
  await nut('Đã phục vụ').last().click();
  await trang.getByText('Order đã phục vụ', { exact: false }).first().waitFor({ timeout: 1 }).catch(() => {});
  await trang.waitForTimeout(300);
  kiem('PATCH trang-thai da_phuc_vu', luu().p.endsWith('/trang-thai') && luu().body.trang_thai_moi === 'da_phuc_vu');
  kiem('đã phục vụ: mất nút Đã phục vụ, còn Hủy order', (await nut('Đã phục vụ').count()) === 0 && (await nut('Hủy order').count()) === 1);
  await nut('Cà phê sữa x3').click();
  await nut('Giảm Cà phê sữa').click();
  await nut('Lưu').click();
  await trang.getByText('2 × Cà phê sữa').waitFor();
  kiem('bớt ly khi đã phục vụ: không hỏi đã pha, PATCH {so_luong:2}', JSON.stringify(luu().body) === JSON.stringify({ so_luong: 2 }), JSON.stringify(luu().body));

  // 9. Danh sách order
  await nut('Quay lại').click(); // thanh tab nằm dưới màn chi tiết
  await trang.getByRole('tab', { name: /Order/ }).click();
  await trang.getByRole('button', { name: 'Order 1' }).waitFor();
  kiem('danh sách có Order #1, Đã phục vụ, tên khách', (await coChu('#1')) && (await coChu('Nguyễn Thị Hoa')));
  await chup('07-danh-sach-order');
  await nut('Đã hủy').click();
  await trang.getByText('Chưa có order nào').waitFor();
  kiem('lọc "Đã hủy" -> chưa có', true);
  await nut('Tất cả').click();

  // 10. Hủy order đã phục vụ (xác nhận, không hỏi đã pha)
  await trang.getByRole('button', { name: 'Order 1' }).click();
  await nut('Hủy order').click();
  await trang.getByText('Hủy Order #1?').waitFor();
  await nut('Hủy order').last().click();
  await trang.getByText('Order đã hủy, không thể sửa.').waitFor();
  kiem('hủy order -> POST /huy, chuyển sang read-only', luu().p.endsWith('/huy') && (await nut('Thêm món').count()) === 0);
  await chup('08-order-da-huy');

  // 11. Lỗi thiếu nguyên liệu: giữ giỏ, hiện thông báo
  await nut('Quay lại').click();
  await trang.getByRole('tab', { name: /Gọi món/ }).click();
  await nut('Thêm Cà phê sữa').click();
  for (let i = 0; i < 4; i++) await nut('Tăng Cà phê sữa').click();
  await trang.getByRole('button', { name: /^Xem giỏ · 5 ly/ }).click();
  await nut('Gửi order').click();
  await trang.getByText('Không đủ nguyên liệu: Sữa đặc cần 500 g').waitFor();
  kiem('409 thiếu nguyên liệu -> báo lỗi, giỏ còn nguyên', (await coChu('5 ly')) && (await nut('Gửi order').count()) === 1);
  await chup('09-thieu-nguyen-lieu');
  for (let i = 0; i < 3; i++) await nut('Giảm Cà phê sữa').click();
  await nut('Gửi order').click();
  await trang.getByText('Order #2').first().waitFor();
  kiem('sửa còn 2 ly -> gửi được Order #2, giỏ đã xóa', (await coChu('2 × Cà phê sữa')));

  // 12. Hủy order đang pha chế: chọn số ly đã pha
  await nut('Hủy order').click();
  await trang.getByText('Hủy Order #2?').waitFor();
  await nut('Tăng Cà phê sữa (gọi 2): đã pha').click();
  await trang.waitForTimeout(400);
  await chup('10-huy-da-lam');
  await nut('Hủy order').last().click();
  await trang.getByText('Order đã hủy, không thể sửa.').waitFor();
  const h = luu().body;
  kiem('hủy có đã pha 1 ly -> POST /huy {da_lam:[{so_luong:1}]}', Array.isArray(h.da_lam) && h.da_lam.length === 1 && h.da_lam[0].so_luong === 1, JSON.stringify(h));
  await nut('Quay lại').click();
  await trang.getByRole('tab', { name: /Gọi món/ }).click();
  kiem('sau khi gửi giỏ trống (không còn thanh Xem giỏ)', (await trang.getByRole('button', { name: /^Xem giỏ/ }).count()) === 0);
} catch (e) {
  kiem('chạy hết kịch bản', false, e.message.split('\n')[0]);
  await chup('loi-cuoi').catch(() => {});
}
await ketThuc();
