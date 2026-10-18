// Kiểm tra giao diện ẩn trang/tab (HT-01) KHÔNG cần backend/MySQL: chặn mọi gọi /api bằng dữ liệu giả, đổi danh sách "đang ẩn" giữa chừng
// như khi chạy scripts/an-trang/an-trang.js, rồi kiểm tra menu, trang, tab, tải lại định kỳ, lỗi mạng. Ảnh: scripts/anh-smoke/20-*.png ... 23-*.png
// Chạy: cd frontend && npm run build && (npx vite preview --port 4173 &) && node scripts/smoke-trang-an.mjs
// Cần: playwright (xem smoke-ui.mjs).
import { chromium } from 'playwright';
import fs from 'node:fs';

const GOC = process.env.URL || 'http://localhost:4173';
const RA = new URL('./anh-smoke/', import.meta.url).pathname;
fs.mkdirSync(RA, { recursive: true });

const nguoi = { ma_tai_khoan: 2, ma_nhan_vien: 2, ho_ten: 'Trần Thị Quản Lý', quyen_truy_cap: 'quan_ly' };
const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const dsRong = { ok: true, data: [], tong_so_ban_ghi: 0, trang: 1, moi_trang: 10 };

let trangAn = {};          // giả lập nội dung backend/config/trang-an.json
let loiHeThong = false;    // true: endpoint he-thong trả 500
let treoHeThong = false;   // true: endpoint he-thong không bao giờ trả lời (máy chủ treo)
let chuaCoEndpoint = false; // true: backend bản cũ, chưa có /he-thong (404)
let soLanHoi = 0;
const luc = '2026-10-18T02:50:33.007Z';

const trinhDuyet = await chromium.launch();
const trang = await trinhDuyet.newPage({ viewport: { width: 1360, height: 900 } });
const loiConsole = [];
trang.on('pageerror', e => loiConsole.push(e.message));
trang.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|ERR_NAME|fonts\.g|500|404/.test(m.text())) loiConsole.push(m.text()); });

await trang.route('**/api/**', route => {
  const p = new URL(route.request().url()).pathname.replace(/^.*\/api/, '');
  if (p === '/auth/dang-nhap') return json(route, { ok: true, data: { token: 't', nguoi_dung: nguoi } });
  if (p === '/auth/toi') return json(route, { ok: true, data: nguoi });
  if (p === '/he-thong/trang-an') {
    soLanHoi++;
    if (treoHeThong) return undefined; // để yêu cầu treo
    if (chuaCoEndpoint) return json(route, { ok: false, loi: 'KHONG_TIM_THAY', thong_bao: 'Không tìm thấy GET /he-thong/trang-an' }, 404);
    return loiHeThong ? json(route, { ok: false, loi: 'LOI_HE_THONG', thong_bao: 'Lỗi hệ thống' }, 500) : json(route, { ok: true, data: { trang_an: trangAn } });
  }
  if (p === '/kho/ton-kho') return json(route, { ok: true, data: [] });
  if (p === '/bao-cao/doanh-thu' || p === '/bao-cao/chi-phi-vs-doanh-thu') return json(route, { ok: true, data: [] });
  if (p === '/nhan-su/ca-lam-viec' || p === '/danh-muc') return json(route, { ok: true, data: [] });
  if (p === '/nhan-su/lich-tuan') return json(route, { ok: true, tu_ngay: '2026-10-12', den_ngay: '2026-10-18', data: [] });
  return json(route, dsRong);
});
await trang.clock.install(); // để tua nhanh 30 giây của vòng tải lại

const kiemTra = (dieuKien, mota) => { if (!dieuKien) { console.error('FAIL:', mota); process.exitCode = 1; } else console.log('ok  :', mota); };
const menu = ten => trang.getByRole('navigation', { name: 'Menu chính' }).getByRole('link', { name: new RegExp(`^${ten}`) });
const coThongBao = () => trang.getByRole('heading', { name: 'Trang này hiện không khả dụng' }).count();
const khoa = async loc => (await loc.getAttribute('class')).split(/\s+/).includes('khoa');

// ---- Đăng nhập, chưa ẩn gì ----
await trang.goto(GOC);
await trang.waitForURL('**/dang-nhap');
await trang.fill('#ten', 'quanly'); await trang.fill('#mk', 'dung'); await trang.click('button[type=submit]');
await trang.waitForURL('**/san-pham');
await trang.getByRole('heading', { name: 'Sản phẩm', level: 1 }).waitFor();
kiemTra(await coThongBao() === 0, 'chưa ẩn gì: trang Sản phẩm hiện bình thường');
kiemTra(await trang.locator('.menu-muc.khoa').count() === 0, 'chưa ẩn gì: menu không có mục nào bị khóa');
await menu('Nhân viên').click();
await trang.getByRole('heading', { name: 'Nhân viên', level: 1 }).waitFor();
kiemTra(await coThongBao() === 0, 'chưa ẩn gì: trang Nhân viên mở được');

// ---- Ẩn cả trang (đổi file, rồi bấm menu = đổi trang nên web hỏi lại) ----
trangAn = { 'nhan-vien': { ly_do: 'Đang cập nhật danh sách nhân viên.', luc }, 'khuyen-mai': { ly_do: 'Bảo trì khuyến mãi.', luc } };
await menu('Sản phẩm').click();
await trang.getByRole('heading', { name: 'Sản phẩm', level: 1 }).waitFor();
kiemTra(await khoa(menu('Nhân viên')) && await khoa(menu('Khuyến mãi')), 'menu: Nhân viên và Khuyến mãi mờ đi (class khoa)');
kiemTra(!(await khoa(menu('Sản phẩm'))) && !(await khoa(menu('Hóa đơn'))), 'menu: Sản phẩm và Hóa đơn vẫn bình thường');
kiemTra(await menu('Nhân viên').getByText('(không khả dụng)').count() === 1, 'menu: mục bị ẩn có chữ cho trình đọc màn hình');
kiemTra(await menu('Nhân viên').locator('svg').count() === 2, 'menu: mục bị ẩn có thêm icon khóa');
await menu('Nhân viên').click();
await trang.getByRole('heading', { name: 'Trang này hiện không khả dụng' }).waitFor();
kiemTra(await trang.getByText('Đang cập nhật danh sách nhân viên.').count() === 1, 'bấm Nhân viên: hiện thông báo kèm lý do');
kiemTra(await trang.getByRole('heading', { name: 'Nhân viên', level: 1 }).count() === 0, 'bấm Nhân viên: không còn nội dung trang');
kiemTra(await trang.getByRole('navigation', { name: 'Menu chính' }).isVisible(), 'bấm Nhân viên: menu vẫn còn để chuyển trang khác');
await trang.screenshot({ path: RA + '20-trang-an-ca-trang.png' });
await menu('Khuyến mãi').click();
await trang.getByText('Bảo trì khuyến mãi.').waitFor();
kiemTra(true, 'bấm Khuyến mãi: hiện lý do riêng của trang đó');
await trang.goto(`${GOC}/nhan-vien`); // gõ thẳng URL
await trang.getByRole('heading', { name: 'Trang này hiện không khả dụng' }).waitFor();
kiemTra(true, 'gõ thẳng /nhan-vien (tải lại trang): vẫn hiện thông báo');

// ---- Ẩn riêng từng tab ----
trangAn = { 'kho/lich-su-nhap': { ly_do: 'Đang kiểm kê phiếu nhập.', luc }, 'bao-cao/chi-phi': { ly_do: 'Báo cáo chi phí đang sửa.', luc } };
await menu('Tồn kho').click();
await trang.getByRole('navigation', { name: 'Các mục của kho' }).waitFor();
kiemTra(await coThongBao() === 0, 'ẩn tab Lịch sử nhập: tab Tồn kho vẫn dùng được');
const tabKho = ten => trang.getByRole('navigation', { name: 'Các mục của kho' }).getByRole('link', { name: new RegExp(`^${ten}`) });
kiemTra(await khoa(tabKho('Lịch sử nhập')) && !(await khoa(tabKho('Tồn kho'))) && !(await khoa(tabKho('Nguyên liệu'))), 'thanh tab: chỉ Lịch sử nhập mờ đi');
kiemTra(await khoa(menu('Nhập hàng')) && !(await khoa(menu('Tồn kho'))), 'menu: Nhập hàng mờ đi, Tồn kho thì không');
await tabKho('Lịch sử nhập').click();
await trang.getByText('Đang kiểm kê phiếu nhập.').waitFor();
kiemTra(await trang.getByRole('navigation', { name: 'Các mục của kho' }).isVisible(), 'bấm tab bị ẩn: thông báo nằm trong khung, thanh tab vẫn còn');
await trang.screenshot({ path: RA + '21-trang-an-tab.png' });
await tabKho('Nguyên liệu').click();
await trang.getByRole('heading', { name: 'Nguyên liệu', level: 1 }).waitFor();
kiemTra(await coThongBao() === 0, 'chuyển sang tab khác của Kho: dùng bình thường');

await menu('Báo cáo').click();
await trang.getByRole('button', { name: 'Xem báo cáo' }).waitFor();
await trang.getByRole('navigation', { name: 'Các báo cáo' }).getByRole('link', { name: /^Chi phí nhập/ }).click();
await trang.getByText('Báo cáo chi phí đang sửa.').waitFor();
kiemTra(await trang.getByRole('button', { name: 'Xem báo cáo' }).count() === 0, 'Báo cáo tab Chi phí: thông báo thay cả bộ lọc và nội dung');
await trang.getByRole('navigation', { name: 'Các báo cáo' }).getByRole('link', { name: /^Doanh thu/ }).click();
await trang.getByRole('button', { name: 'Xem báo cáo' }).waitFor();
kiemTra(true, 'Báo cáo tab Doanh thu vẫn dùng được');

// ---- Ẩn cả trang cha thì mọi tab bị ẩn ----
trangAn = { 'khach-hang': { ly_do: 'Nâng cấp dữ liệu khách hàng.', luc } };
await menu('Khách hàng').click();
await trang.getByText('Nâng cấp dữ liệu khách hàng.').waitFor();
kiemTra(await trang.getByRole('navigation', { name: 'Các mục của khách hàng' }).count() === 0, 'ẩn trang cha Khách hàng: cả trang bị thay bằng thông báo');
await trang.goto(`${GOC}/khach-hang/than-thiet`);
await trang.getByText('Nâng cấp dữ liệu khách hàng.').waitFor();
kiemTra(true, 'ẩn trang cha: gõ thẳng URL của tab con cũng bị chặn');

// ---- Tải lại định kỳ, nút "Kiểm tra lại", hiện lại trang ----
trangAn = {};
const truoc = soLanHoi;
await trang.clock.fastForward(31000);
await trang.getByRole('heading', { name: 'Khách hàng', level: 1 }).waitFor();
kiemTra(soLanHoi > truoc, 'sau 30 giây web tự hỏi lại backend');
kiemTra(true, 'bật lại trang: nội dung tự trở lại, không cần tải lại trang');
trangAn = { 'hoa-don': { ly_do: 'Bảo trì hóa đơn.', luc } };
await trang.clock.fastForward(31000);
await menu('Hóa đơn').click();
await trang.getByText('Bảo trì hóa đơn.').waitFor();
trangAn = {};
await trang.getByRole('button', { name: 'Kiểm tra lại' }).click();
await trang.getByRole('heading', { name: 'Hóa đơn', level: 1 }).waitFor();
kiemTra(true, 'nút "Kiểm tra lại": trang mở lại ngay khi đã được bật');

// ---- Lỗi mạng/backend: giữ nguyên trạng thái đang có, không tự ý ẩn ----
trangAn = { 'nhan-vien': { ly_do: 'Bảo trì.', luc } };
await menu('Nhân viên').click();
await trang.getByText('Bảo trì.', { exact: true }).waitFor();
loiHeThong = true;
await trang.clock.fastForward(31000);
await menu('Hóa đơn').click();
await trang.getByRole('heading', { name: 'Hóa đơn', level: 1 }).waitFor();
await menu('Nhân viên').click();
await trang.getByText('Bảo trì.', { exact: true }).waitFor();
kiemTra(true, 'endpoint lỗi 500: danh sách đang ẩn được giữ nguyên (không mở nhầm trang đang bảo trì)');
loiHeThong = false; trangAn = {};

// ---- Máy chủ treo: sau 5 giây bỏ chờ, trang vẫn mở được (không kẹt "Đang tải…") ----
treoHeThong = true;
await trang.goto(`${GOC}/hoa-don`);
await trang.getByText('Đang tải…').first().waitFor();
await trang.clock.fastForward(6000);
await trang.getByRole('heading', { name: 'Hóa đơn', level: 1 }).waitFor();
kiemTra(true, 'endpoint treo: sau 5 giây trang vẫn mở bình thường');
treoHeThong = false;

// ---- Backend bản cũ chưa có endpoint (404): web vẫn dùng bình thường ----
chuaCoEndpoint = true;
await trang.goto(`${GOC}/san-pham`);
await trang.getByRole('heading', { name: 'Sản phẩm', level: 1 }).waitFor();
await menu('Nhân viên').click();
await trang.getByRole('heading', { name: 'Nhân viên', level: 1 }).waitFor();
kiemTra(await coThongBao() === 0 && await trang.locator('.menu-muc.khoa').count() === 0, 'backend chưa có endpoint (404): không ẩn gì, mọi trang dùng bình thường');
chuaCoEndpoint = false;

// ---- Điện thoại ----
await trang.setViewportSize({ width: 390, height: 800 });
trangAn = { 'nhan-vien': { ly_do: 'Đang cập nhật danh sách nhân viên.', luc } };
await trang.clock.fastForward(31000);
await trang.getByText('Đang cập nhật danh sách nhân viên.').waitFor();
await trang.waitForTimeout(300);
kiemTra(await trang.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'điện thoại: thông báo không gây cuộn ngang');
await trang.screenshot({ path: RA + '22-trang-an-di-dong.png' });
await trang.getByRole('button', { name: 'Mở menu' }).click();
await trang.waitForTimeout(400);
await trang.screenshot({ path: RA + '23-trang-an-menu-di-dong.png' });

kiemTra(loiConsole.length === 0, `không có lỗi console (${loiConsole.join(' | ')})`);
await trinhDuyet.close();
