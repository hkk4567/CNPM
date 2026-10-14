// Kiểm thử giao diện app trên bản web (expo export --platform web) bằng playwright, API được giả lập.
// Chạy: npm run build-web && node scripts/smoke-web.mjs   (cần playwright: npm i -D playwright, hoặc chạy từ thư mục có sẵn playwright)
import { khoiDong, ok, loi, CORS } from './lib-smoke.mjs';

const { trang, kiem, chup, gia, ketThuc, URL_APP } = await khoiDong({ cong: 4174 });

const hai = (n) => String(n).padStart(2, '0');
const chuoi = (d) => `${d.getFullYear()}-${hai(d.getMonth() + 1)}-${hai(d.getDate())}`;
const thuHai = (d) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const cong = (s, n) => { const [y, m, d] = s.split('-').map(Number); const x = new Date(y, m - 1, d, 12); x.setDate(x.getDate() + n); return chuoi(x); };

const NV = { ma_tai_khoan: 5, ma_nhan_vien: 7, ho_ten: 'Nguyễn Văn An', quyen_truy_cap: 'nhan_vien' };
let matKhauHienTai = 'matkhau1';
let hetPhien = false;

const yeuCauLich = [];
await trang.route('**/api/**', async (route) => {
  const rq = route.request(); const u = new URL(rq.url()); const p = u.pathname.replace(/^.*\/api/, '');
  if (rq.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  const tra = (kq) => route.fulfill({ ...kq, headers: CORS });
  if (p === '/auth/dang-nhap') {
    const b = JSON.parse(rq.postData() || '{}');
    if (b.ten_dang_nhap === 'an' && b.mat_khau === matKhauHienTai) return tra(ok({ token: 'tok-an', nguoi_dung: NV }));
    return tra(loi(401, 'SAI_THONG_TIN', 'Tên đăng nhập hoặc mật khẩu không đúng'));
  }
  if (hetPhien) return tra(loi(401, 'TOKEN_HET_HAN', 'Phiên đã hết hạn'));
  if (rq.headers()['authorization'] !== 'Bearer tok-an') return tra(loi(401, 'CHUA_DANG_NHAP', 'Chưa đăng nhập'));
  if (p === '/auth/toi') return tra(ok(NV));
  if (p === '/san-pham/menu') return tra(ok([]));
  if (p === '/auth/doi-mat-khau') {
    const b = JSON.parse(rq.postData() || '{}');
    if (b.mat_khau_cu !== matKhauHienTai) return tra(loi(400, 'SAI_MAT_KHAU_CU', 'Mật khẩu cũ không đúng'));
    matKhauHienTai = b.mat_khau_moi; return tra(ok({ da_doi: true }));
  }
  if (p === '/nhan-su/lich-tuan') {
    const tu = u.searchParams.get('tu_ngay'); yeuCauLich.push({ tu, nv: u.searchParams.get('ma_nhan_vien') });
    const homNay = chuoi(new Date()); const dau = chuoi(thuHai(new Date()));
    const data = [];
    if (tu === dau) {
      data.push({ ngay_lam: homNay, ma_ca: 1, ten_ca: 'Ca sáng', thoi_gian_bat_dau: '00:00:00', thoi_gian_ket_thuc: '23:59:00', ma_nhan_vien: 7, ho_ten: NV.ho_ten });
      data.push({ ngay_lam: cong(dau, 6), ma_ca: 2, ten_ca: 'Ca tối', thoi_gian_bat_dau: '18:00:00', thoi_gian_ket_thuc: '22:00:00', ma_nhan_vien: 7, ho_ten: NV.ho_ten });
    }
    return tra(ok(data, { tu_ngay: tu, den_ngay: cong(tu, 6) }));
  }
  return tra(loi(404, 'KHONG_TIM_THAY', 'Không có API này'));
});

try {
  // 1. Chưa đăng nhập -> màn đăng nhập
  await trang.goto(URL_APP);
  await trang.getByText('Đăng nhập dành cho nhân viên').waitFor();
  kiem('mở app chưa có token -> màn đăng nhập', true);
  await chup('01-dang-nhap');

  // 2. Thiếu thông tin / sai mật khẩu
  await trang.getByRole('button', { name: 'Đăng nhập' }).click();
  kiem('để trống -> báo nhập đủ', await trang.getByText('Nhập tên đăng nhập và mật khẩu').isVisible());
  await trang.getByLabel('Tên đăng nhập').fill('an');
  await trang.getByLabel('Mật khẩu', { exact: true }).fill('sai');
  await trang.getByRole('button', { name: 'Đăng nhập' }).click();
  await trang.getByText('Tên đăng nhập hoặc mật khẩu không đúng').waitFor();
  kiem('sai mật khẩu -> báo lỗi từ máy chủ', true);

  // 3. Ẩn/hiện mật khẩu
  kiem('mật khẩu đang ẩn', (await trang.getByLabel('Mật khẩu', { exact: true }).getAttribute('type')) === 'password');
  await trang.getByRole('button', { name: 'Hiện mật khẩu' }).click();
  kiem('bấm mắt -> hiện mật khẩu', (await trang.getByLabel('Mật khẩu', { exact: true }).getAttribute('type')) !== 'password');

  // 4. Đăng nhập đúng -> lịch tuần này
  await trang.getByLabel('Mật khẩu', { exact: true }).fill('matkhau1');
  await trang.getByRole('button', { name: 'Đăng nhập' }).click();
  await trang.getByText('Menu đang trống').waitFor();
  kiem('đăng nhập xong mở tab Gọi món đầu tiên', true);
  await trang.getByRole('tab', { name: /Lịch làm việc/ }).click();
  await trang.getByText('Lịch làm việc của tôi').waitFor();
  await trang.getByText('Tuần này bạn có 2 ca').waitFor();
  kiem('đăng nhập đúng -> lịch tuần này, tổng 2 ca', true);
  kiem('luôn xin lịch của chính mình (ma_nhan_vien=7)', yeuCauLich.every((r) => r.nv === '7') && yeuCauLich.length > 0);
  kiem('xin lịch từ thứ Hai', yeuCauLich[0].tu === chuoi(thuHai(new Date())));
  kiem('có chip Hôm nay', await trang.getByText('Hôm nay', { exact: true }).first().isVisible());
  kiem('ca hôm nay 00:00–23:59 đang diễn ra', await trang.getByText('Đang diễn ra').isVisible());
  kiem('ngày không có ca hiện Nghỉ', (await trang.getByText('Nghỉ', { exact: true }).count()) === 5);
  await chup('02-lich-tuan-nay');

  // 5. Chuyển tuần
  await trang.getByRole('button', { name: 'Tuần sau' }).click();
  await trang.getByText('Tuần này bạn chưa có ca nào').waitFor();
  kiem('tuần sau trống -> báo chưa có ca', true);
  kiem('hiện nút Tuần này để quay lại', await trang.getByText('Tuần này', { exact: true }).isVisible());
  await chup('03-lich-tuan-sau');
  await trang.getByText('Tuần này', { exact: true }).click();
  await trang.getByText('Tuần này bạn có 2 ca').waitFor();
  kiem('quay lại tuần này', true);

  // 6. Tab Cá nhân
  await trang.getByRole('tab', { name: /Cá nhân/ }).click();
  await trang.getByText('Nguyễn Văn An').waitFor();
  kiem('tab Cá nhân hiện tên và quyền Nhân viên', await trang.getByText('Nhân viên', { exact: true }).isVisible());
  await chup('04-ca-nhan');

  // 7. Đổi mật khẩu
  await trang.getByRole('button', { name: 'Đổi mật khẩu' }).click();
  await trang.getByText('Nhập lại mật khẩu mới').first().waitFor();
  await trang.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();
  kiem('để trống -> báo nhập mật khẩu hiện tại', await trang.getByText('Nhập mật khẩu hiện tại').isVisible());
  await trang.getByLabel('Mật khẩu hiện tại').fill('matkhau1');
  await trang.getByLabel('Mật khẩu mới', { exact: true }).fill('abcdefgh');
  await trang.getByLabel('Nhập lại mật khẩu mới').fill('abcdefgh');
  await trang.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();
  kiem('thiếu chữ số -> báo luật', await trang.getByText('Phải có ít nhất một chữ cái và một chữ số').isVisible());
  await trang.getByLabel('Mật khẩu mới', { exact: true }).fill('matkhau1');
  await trang.getByLabel('Nhập lại mật khẩu mới').fill('matkhau1');
  await trang.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();
  kiem('mới trùng cũ -> báo khác mật khẩu cũ', await trang.getByText('Mật khẩu mới phải khác mật khẩu cũ').first().isVisible());
  await trang.getByLabel('Mật khẩu hiện tại').fill('saisai1');
  await trang.getByLabel('Mật khẩu mới', { exact: true }).fill('matkhau2');
  await trang.getByLabel('Nhập lại mật khẩu mới').fill('matkhau3');
  await trang.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();
  kiem('nhập lại không khớp', await trang.getByText('Nhập lại chưa khớp').isVisible());
  await trang.getByLabel('Nhập lại mật khẩu mới').fill('matkhau2');
  await trang.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();
  await trang.getByText('Mật khẩu hiện tại không đúng').waitFor();
  kiem('sai mật khẩu cũ -> báo từ máy chủ, KHÔNG bị đăng xuất', await trang.getByText('Nhập lại mật khẩu mới').first().isVisible());
  await chup('05-doi-mat-khau-loi');
  await trang.getByLabel('Mật khẩu hiện tại').fill('matkhau1');
  await trang.getByRole('button', { name: 'Lưu mật khẩu mới' }).click();
  await trang.getByText('Đã đổi mật khẩu').waitFor();
  kiem('đổi thành công', true);
  await chup('06-doi-mat-khau-xong');
  await trang.getByRole('button', { name: 'Xong' }).click();

  // 8. Giữ phiên khi tải lại trang
  await trang.reload();
  await trang.getByText('Nguyễn Văn An').waitFor(); // mở lại đúng tab Cá nhân (đường dẫn /toi)
  kiem('tải lại trang vẫn đăng nhập (token đã lưu)', true);

  // 9. Đăng xuất có xác nhận
  await trang.getByRole('button', { name: 'Đăng xuất' }).click();
  await trang.getByText('Đăng xuất?').waitFor();
  await chup('07-xac-nhan-dang-xuat');
  await trang.getByRole('button', { name: 'Hủy' }).click();
  kiem('Hủy -> vẫn ở lại', await trang.getByText('Nguyễn Văn An').isVisible());
  await trang.getByRole('button', { name: 'Đăng xuất' }).first().click();
  await trang.getByRole('button', { name: 'Đăng xuất' }).last().click();
  await trang.getByText('Đăng nhập dành cho nhân viên').waitFor();
  kiem('xác nhận -> về màn đăng nhập', true);

  // 10. Hết phiên giữa chừng -> tự về đăng nhập
  await trang.getByLabel('Tên đăng nhập').fill('an');
  await trang.getByLabel('Mật khẩu', { exact: true }).fill('matkhau2');
  await trang.getByRole('button', { name: 'Đăng nhập' }).click();
  await trang.getByRole('tab', { name: /Lịch làm việc/ }).click();
  await trang.getByText('Lịch làm việc của tôi').waitFor();
  hetPhien = true;
  await trang.getByRole('button', { name: 'Tuần sau' }).click();
  await trang.getByText('Đăng nhập dành cho nhân viên').waitFor();
  kiem('API trả 401 -> tự về màn đăng nhập', true);

  // 11. Mất kết nối máy chủ -> báo lỗi rõ + thử lại
  hetPhien = false;
  await trang.unroute('**/api/**');
  await trang.route('**/api/**', (r) => r.request().method() === 'OPTIONS' ? r.fulfill({ status: 204, headers: CORS }) : r.abort());
  await trang.getByLabel('Tên đăng nhập').fill('an');
  await trang.getByLabel('Mật khẩu', { exact: true }).fill('matkhau2');
  await trang.getByRole('button', { name: 'Đăng nhập' }).click();
  await trang.getByText(/Không kết nối được máy chủ/).waitFor();
  kiem('mất kết nối -> thông báo hướng dẫn kiểm tra', true);
  await chup('08-mat-ket-noi');

  // 12. Đổi địa chỉ máy chủ được chuẩn hóa và nhớ lại
  await trang.getByRole('button', { name: /Máy chủ/ }).click();
  await trang.getByLabel('Địa chỉ máy chủ').fill('192.168.1.10:3000');
  await trang.getByRole('button', { name: 'Đăng nhập' }).click();
  await trang.getByText(/192\.168\.1\.10:3000\/api/).waitFor();
  kiem('địa chỉ "192.168.1.10:3000" -> http://192.168.1.10:3000/api', true);
  kiem('địa chỉ được lưu', (await trang.evaluate(() => localStorage.getItem('api_url'))) === 'http://192.168.1.10:3000/api');

  } catch (e) {
  kiem('chạy hết kịch bản', false, e.message.split('\n')[0]);
  await chup('loi-cuoi').catch(() => {});
}
await ketThuc();
