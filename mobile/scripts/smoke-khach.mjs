// Kiểm thử giao diện gắn khách / tạo nhanh khách (KH-01, KH-03, POS-06) trên bản web, API giả lập (scripts/mock-api.mjs).
// Chạy: npm run build-web && PW_DIR=<thư mục có playwright> node scripts/smoke-khach.mjs
import { khoiDong } from './lib-smoke.mjs';
import { caiGia, goi, khachHang } from './mock-api.mjs';

const { trang, kiem, chup, gia, ketThuc, URL_APP } = await khoiDong({ cong: 4177, tienTo: 'kh-' });
await caiGia(gia);
const coChu = async (t) => (await trang.locator('body').innerText()).includes(t);
const nut = (ten) => trang.getByRole('button', { name: ten, exact: true });
const o = () => trang.getByLabel('Số điện thoại hoặc tên');
const luu = () => goi[goi.length - 1];
const nGoiKH = () => goi.filter((g) => g.p === '/khach-hang').length;

try {
  await trang.goto(URL_APP);
  await trang.getByLabel('Tên đăng nhập').fill('an');
  await trang.getByLabel('Mật khẩu', { exact: true }).fill('matkhau1');
  await trang.getByRole('button', { name: 'Đăng nhập' }).click();
  await nut('Thêm Bạc xỉu').click();
  await trang.getByRole('button', { name: /^Xem giỏ/ }).click();
  await nut('Gửi order').click();
  await trang.getByText('Order #1').first().waitFor();
  kiem('order mới là khách lẻ, có nút Gắn khách', (await coChu('Khách lẻ')) && (await nut('Gắn khách').count()) === 1);

  // 1. Để trống
  await nut('Gắn khách').click();
  await nut('Tìm').click();
  kiem('để trống -> nhắc nhập SĐT hoặc tên', await coChu('Nhập số điện thoại hoặc tên khách'));

  // 2. Tìm theo tên (không dấu), chọn từ danh sách
  await o().fill('hoa');
  await nut('Tìm').click();
  await trang.getByRole('button', { name: 'Chọn Nguyễn Thị Hoa 0912345678' }).waitFor();
  kiem('tìm "hoa" ra 2 khách (Nguyễn Thị Hoa, Trần Thị Hoa) kèm SĐT và điểm', (await trang.getByRole('button', { name: /^Chọn / }).count()) === 2 && (await coChu('40 điểm')));
  await trang.waitForTimeout(300);
  await chup('01-tim-khach');
  await trang.getByRole('button', { name: 'Chọn Trần Thị Hoa 0933333333' }).click();
  await nut('Đổi khách').waitFor();
  kiem('chọn khách trong danh sách -> gắn vào order, nút thành "Đổi khách"', (await nut('Đổi khách').count()) === 1 && luu().body.so_dien_thoai === '0933333333');

  // 3. Tìm không ra -> tạo khách mới (điền sẵn tên)
  await nut('Đổi khách').click();
  await o().fill('Lê Minh');
  await nut('Tìm').click();
  await trang.getByText('Không tìm thấy khách nào khớp', { exact: false }).waitFor();
  kiem('không ra khách -> gợi ý Tạo khách mới', (await nut('Tạo khách mới').count()) === 1);
  await nut('Tạo khách mới').click();
  await trang.getByText('Tạo xong sẽ gắn luôn vào order này', { exact: false }).waitFor();
  kiem('form tạo khách điền sẵn tên đã gõ', (await trang.getByLabel('Tên khách hàng').inputValue()) === 'Lê Minh');
  // 3a. Kiểm tra trước ở client
  await nut('Tạo và gắn khách').click();
  kiem('SĐT trống -> báo luật SĐT, chưa gọi máy chủ', (await coChu('Số điện thoại gồm 10 chữ số và bắt đầu bằng 0')) && nGoiKH() === 0);
  await trang.getByLabel('Tên khách hàng').fill('');
  await trang.getByLabel('Số điện thoại', { exact: true }).fill('0911111111');
  await nut('Tạo và gắn khách').click();
  kiem('tên trống -> báo nhập tên', await coChu('Nhập tên khách'));
  await trang.waitForTimeout(300);
  await chup('02-tao-khach');
  // 3b. Trùng SĐT (0912345678 đã có) -> quay lại tìm, không tạo trùng
  await trang.getByLabel('Tên khách hàng').fill('Lê Minh');
  await trang.getByLabel('Số điện thoại', { exact: true }).fill('0912345678');
  await nut('Tạo và gắn khách').click();
  await trang.getByText('Số điện thoại này đã có khách', { exact: false }).waitFor();
  kiem('trùng SĐT (409) -> báo đã có khách, quay về ô tìm với SĐT đó, không tạo trùng', (await o().inputValue()) === '0912345678' && khachHang.length === 3);
  // 3c. Tạo thành công
  await nut('Đóng').click();
  await nut('Đổi khách').click();
  await o().fill('Lê Minh');
  await nut('Tìm').click();
  await nut('Tạo khách mới').click();
  await trang.getByLabel('Số điện thoại', { exact: true }).fill('0911222333');
  await nut('Tạo và gắn khách').click();
  await trang.getByRole('button', { name: 'Tạo và gắn khách' }).waitFor({ state: 'detached' });
  const tao = goi.filter((g) => g.p === '/khach-hang' && g.m === 'POST' && g.body.so_dien_thoai === '0911222333')[0];
  kiem('tạo thành công: POST /khach-hang {tên, SĐT} rồi gắn luôn vào order', tao && tao.body.ten_khach_hang === 'Lê Minh' && luu().p === '/hoa-don/1/khach-hang' && luu().body.so_dien_thoai === '0911222333', JSON.stringify(luu()));
  kiem('order hiện khách mới, khách có trong dữ liệu', (await coChu('Lê Minh')) && khachHang.some((k) => k.so_dien_thoai === '0911222333' && k.diem_tich_luy === 0));

  // 4. SĐT đủ 10 số chưa đăng ký -> tạo khách điền sẵn SĐT
  await nut('Đổi khách').click();
  await o().fill('0944444444');
  await nut('Tìm').click();
  await trang.getByText('chưa đăng ký thành viên', { exact: false }).waitFor();
  await nut('Tạo khách mới').click();
  kiem('SĐT chưa đăng ký -> tạo khách điền sẵn SĐT, tên trống', (await trang.getByLabel('Số điện thoại', { exact: true }).inputValue()) === '0944444444' && (await trang.getByLabel('Tên khách hàng').inputValue()) === '');
  await trang.getByLabel('Tên khách hàng').fill('Phạm Anh');
  await nut('Tạo và gắn khách').click();
  await trang.getByRole('button', { name: 'Tạo và gắn khách' }).waitFor({ state: 'detached' });
  kiem('tạo + gắn khách thứ hai', khachHang.length === 5);

  // 5. Order bị đóng ở máy khác khi đang gắn: đã tạo khách nhưng không gắn được -> giữ khách, báo rõ
  await nut('Đổi khách').click();
  await o().fill('Vũ Hà');
  await nut('Tìm').click();
  await nut('Tạo khách mới').click();
  await trang.getByLabel('Số điện thoại', { exact: true }).fill('0955555555');
  const { orders } = await import('./mock-api.mjs');
  orders[0].trang_thai = 'huy'; // máy khác vừa hủy order
  await nut('Tạo và gắn khách').click();
  await trang.getByText('Order đã hủy, không thể sửa.').waitFor();
  kiem('order đã bị hủy: hộp đóng, màn hình tải lại ở trạng thái Đã hủy (khách vừa tạo vẫn được lưu)', khachHang.some((k) => k.so_dien_thoai === '0955555555'));
} catch (e) {
  kiem('chạy hết kịch bản', false, e.message.split('\n')[0]);
  await chup('loi-cuoi').catch(() => {});
}
await ketThuc();
