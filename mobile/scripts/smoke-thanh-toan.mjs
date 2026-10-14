// Kiểm thử giao diện Thanh toán / Hóa đơn trên bản web, API giả lập có trạng thái (scripts/mock-api.mjs).
// Chạy: npm run build-web && PW_DIR=<thư mục có playwright> node scripts/smoke-thanh-toan.mjs
import { khoiDong } from './lib-smoke.mjs';
import { caiGia, goi, orders } from './mock-api.mjs';

const { trang, kiem, chup, gia, ketThuc, URL_APP } = await khoiDong({ cong: 4176, tienTo: 'tt-' });
await caiGia(gia);
// Hộp chia sẻ của trình duyệt: ghi lại nội dung thay vì mở hộp thật
await trang.addInitScript(() => { window.__chiaSe = null; navigator.share = async (d) => { window.__chiaSe = d; }; });

const coChu = async (t) => (await trang.locator('body').innerText()).includes(t);
const nut = (ten) => trang.getByRole('button', { name: ten, exact: true });
const luu = () => goi[goi.length - 1];
async function taoOrder(mon, them = 0) {
  await trang.getByRole('tab', { name: /Gọi món/ }).click();
  await nut(`Thêm ${mon}`).click();
  for (let i = 0; i < them; i++) await nut(`Tăng ${mon}`).click();
  await trang.getByRole('button', { name: /^Xem giỏ/ }).click();
  await nut('Gửi order').click();
  await trang.getByRole('button', { name: 'Quay lại' }).waitFor();
}

try {
  await trang.goto(URL_APP);
  await trang.getByLabel('Tên đăng nhập').fill('an');
  await trang.getByLabel('Mật khẩu', { exact: true }).fill('matkhau1');
  await trang.getByRole('button', { name: 'Đăng nhập' }).click();
  await trang.getByText('Cà phê sữa').first().waitFor();

  // Order #1: 2 cà phê + 1 trà đào, gắn khách
  await nut('Thêm Cà phê sữa').click(); await nut('Tăng Cà phê sữa').click(); await nut('Thêm Trà đào').click();
  await trang.getByRole('button', { name: /^Xem giỏ/ }).click();
  await nut('Gửi order').click();
  await trang.getByText('Order #1').first().waitFor();
  await nut('Gắn khách').click();
  await trang.getByLabel('Số điện thoại').fill('0912345678');
  await nut('Gắn khách').last().click();
  await trang.getByText('Nguyễn Thị Hoa').waitFor();

  // 1. Hộp thanh toán
  kiem('đang pha chế vẫn thanh toán được (nút Thanh toán là nút chính)', (await nut('Thanh toán').count()) === 1);
  await nut('Thanh toán').click();
  await trang.getByText('Cộng khoảng 8 điểm', { exact: false }).or(trang.getByText('cộng khoảng 8 điểm', { exact: false })).first().waitFor();
  kiem('hộp thanh toán: tổng 87.000đ, khách Nguyễn Thị Hoa cộng khoảng 8 điểm', (await coChu('87.000đ')) && (await coChu('Khách Nguyễn Thị Hoa: cộng khoảng 8 điểm')));
  kiem('mặc định chọn Tiền mặt', await trang.getByRole('radio', { name: 'Tiền mặt' }).isChecked());
  await trang.getByLabel('Tiền khách đưa (không bắt buộc)').fill('100000');
  kiem('khách đưa 100.000đ -> tiền thối 13.000đ', await coChu('Tiền thối: 13.000đ'));
  await trang.getByLabel('Tiền khách đưa (không bắt buộc)').fill('50000');
  kiem('khách đưa 50.000đ -> báo thiếu 37.000đ', await coChu('Chưa đủ, còn thiếu 37.000đ'));
  await nut('Vừa đủ').click();
  kiem('"Vừa đủ" điền đúng tổng, thối 0đ', await coChu('Tiền thối: 0đ'));
  await trang.waitForTimeout(400);
  await chup('01-hop-thanh-toan');
  await trang.getByRole('radio', { name: 'Chuyển khoản' }).click();
  kiem('chọn Chuyển khoản -> ẩn ô tiền khách đưa', (await trang.getByLabel('Tiền khách đưa (không bắt buộc)').count()) === 0);
  await trang.getByRole('radio', { name: 'Tiền mặt' }).click();
  await nut('Xác nhận thanh toán').click();
  await trang.getByText('Hóa đơn đã thanh toán, không thể sửa.').waitFor();
  kiem('POST /thanh-toan {phuong_thuc_thanh_toan:"tien_mat"}', luu().p === '/hoa-don/1/thanh-toan' && JSON.stringify(luu().body) === '{"phuong_thuc_thanh_toan":"tien_mat"}', JSON.stringify(luu()));
  kiem('banner: đã thanh toán 87.000đ, cộng 8 điểm, khách có 48 điểm', await coChu('Đã thanh toán 87.000đ. Cộng 8 điểm, khách có 48 điểm.'));
  kiem('hóa đơn: Thanh toán: Tiền mặt, tổng tiền, không còn nút sửa', (await coChu('Thanh toán: Tiền mặt')) && (await coChu('Tổng tiền')) && (await nut('Thanh toán').count()) === 0 && (await nut('Thêm món').count()) === 0 && (await nut('Hủy order').count()) === 0);
  await chup('02-hoa-don-da-thanh-toan');

  // 2. Chia sẻ hóa đơn
  await nut('Chia sẻ hóa đơn').click();
  await trang.waitForFunction(() => window.__chiaSe);
  const d = await trang.evaluate(() => window.__chiaSe); const vb = d.message ?? d.text ?? '';
  kiem('chia sẻ hóa đơn: có số hóa đơn, các món, tổng, phương thức, khách', ['HÓA ĐƠN #1', '2 x Cà phê sữa', '1 x Trà đào', 'TỔNG: 87.000đ', 'Thanh toán: Tiền mặt', 'Khách: Nguyễn Thị Hoa'].every((x) => vb.includes(x)), vb);

  // 3. Danh sách: lọc Đã thanh toán
  await nut('Quay lại').click();
  await trang.getByRole('tab', { name: /Order/ }).click();
  await trang.getByRole('button', { name: 'Order 1' }).waitFor();
  await nut('Đã thanh toán').click();
  kiem('danh sách lọc "Đã thanh toán" thấy Order #1 với 87.000đ', (await trang.getByRole('button', { name: 'Order 1' }).count()) === 1 && (await coChu('87.000đ')));
  await nut('Tất cả').click();

  // 4. Khách lẻ + chuyển khoản
  await taoOrder('Bạc xỉu');
  await trang.getByText('Order #2').first().waitFor();
  await nut('Thanh toán').click();
  await trang.getByText('Khách lẻ: không tích điểm.').waitFor();
  await trang.getByRole('radio', { name: 'Chuyển khoản' }).click();
  await nut('Xác nhận thanh toán').click();
  await trang.getByText('Hóa đơn đã thanh toán, không thể sửa.').waitFor();
  kiem('khách lẻ: banner không tích điểm, PT chuyển khoản', (await coChu('Khách lẻ, không tích điểm.')) && luu().body.phuong_thuc_thanh_toan === 'chuyen_khoan' && (await coChu('Thanh toán: Chuyển khoản')));

  // 5. Order bị đóng ở nơi khác khi đang thanh toán
  await nut('Quay lại').click();
  await taoOrder('Bạc xỉu');
  await trang.getByText('Order #3').first().waitFor();
  await nut('Thanh toán').click();
  await trang.getByRole('button', { name: 'Xác nhận thanh toán' }).waitFor();
  orders[2].trang_thai = 'huy'; // máy khác vừa hủy order này
  await nut('Xác nhận thanh toán').click();
  await trang.getByText('Order đã hủy, không thể sửa.').waitFor();
  kiem('409 HOA_DON_DA_DONG -> đóng hộp, tải lại thấy "Đã hủy"', (await trang.getByRole('button', { name: 'Xác nhận thanh toán' }).count()) === 0);
  await chup('03-order-bi-dong');
} catch (e) {
  kiem('chạy hết kịch bản', false, e.message.split('\n')[0]);
  await chup('loi-cuoi').catch(() => {});
}
await ketThuc();
