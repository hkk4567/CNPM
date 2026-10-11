// Kiểm tra nhanh giao diện KHÔNG cần backend/MySQL: chặn mọi gọi /api bằng dữ liệu giả (lấy từ seed.sql),
// đăng nhập, mở màn Sản phẩm, mở panel sửa, chụp ảnh vào frontend/scripts/anh-smoke/.
// Chạy: cd frontend && npm run build && (npx vite preview --port 4173 &) && node scripts/smoke-ui.mjs
// Cần: npm i -D playwright (đã có chromium) hoặc NODE_PATH trỏ tới playwright.
import { chromium } from 'playwright';
import fs from 'node:fs';

const GOC = process.env.URL || 'http://localhost:4173';
const RA = new URL('./anh-smoke/', import.meta.url).pathname;
fs.mkdirSync(RA, { recursive: true });

const sp = [
  [1, 1, 'Cà phê', 'Cà phê đen', 25000, 'con_ban'], [2, 1, 'Cà phê', 'Cà phê sữa', 29000, 'con_ban'],
  [3, 1, 'Cà phê', 'Bạc xỉu', 32000, 'con_ban'], [4, 2, 'Trà', 'Trà đào cam sả', 39000, 'con_ban'],
  [5, 2, 'Trà', 'Trà sữa trân châu', 35000, 'con_ban'], [6, 3, 'Sinh tố', 'Sinh tố bơ', 42000, 'con_ban'],
  [7, 4, 'Bánh', 'Bánh tiramisu', 45000, 'con_ban'], [8, 4, 'Bánh', 'Croissant', 30000, 'ngung_ban'],
].map(([ma, dm, tdm, ten, gia, tt]) => ({ ma_san_pham: ma, ma_danh_muc: dm, ten_danh_muc: tdm, ten_san_pham: ten, gia_ban: String(gia) + '.00', trang_thai: tt }));
const nl = [[1, 'Cà phê bột', 'g'], [2, 'Sữa đặc', 'g'], [3, 'Trân châu', 'g']].map(([m, t, d]) => ({ ma_nguyen_lieu: m, ten_nguyen_lieu: t, don_vi_tinh: d, so_luong_ton: '5000', muc_ton_toi_thieu: '1000' }));
const nguoi = { ma_tai_khoan: 1, ma_nhan_vien: 2, ho_ten: 'Trần Thị Quản Lý', quyen_truy_cap: 'quan_ly' };
const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const trinhDuyet = await chromium.launch();
const trang = await trinhDuyet.newPage({ viewport: { width: 1360, height: 900 } });
const loiConsole = [];
trang.on('pageerror', e => loiConsole.push(e.message));
// Bỏ qua: tải font Google bị chặn trong sandbox, và 401 do chính bài test cố ý đăng nhập sai
trang.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|ERR_NAME|fonts\.g|401/.test(m.text())) loiConsole.push(m.text()); });

await trang.route('**/api/**', route => {
  const u = new URL(route.request().url());
  const p = u.pathname.replace(/^.*\/api/, ''); const pt = route.request().method();
  if (p === '/auth/dang-nhap') {
    const b = JSON.parse(route.request().postData() || '{}');
    return b.mat_khau === 'dung' ? json(route, { ok: true, data: { token: 't', nguoi_dung: nguoi } })
      : json(route, { ok: false, loi: 'SAI_THONG_TIN', thong_bao: 'Sai tên đăng nhập hoặc mật khẩu' }, 401);
  }
  if (p === '/auth/toi') return json(route, { ok: true, data: nguoi });
  if (p === '/danh-muc') return json(route, { ok: true, data: [['Cà phê', 3, 1], ['Trà', 2, 2], ['Sinh tố', 1, 3], ['Bánh', 2, 4]].map(([t, n, m]) => ({ ma_danh_muc: m, ten_danh_muc: t, so_san_pham: n })) });
  if (p === '/san-pham/menu') return json(route, { ok: true, data: sp.filter(s => s.trang_thai === 'con_ban').map(s => ({ ...s, so_ly_toi_da: s.ma_san_pham <= 3 ? 133 : null, khuyen_mai: s.ma_san_pham <= 3 ? [{ ma_khuyen_mai: 1, ten_khuyen_mai: 'Giảm 10%', muc_giam_moi_ly: 2900 }] : [] })) });
  if (p === '/san-pham' && pt === 'GET') {
    const q = u.searchParams.get('tu_khoa') || ''; const ds = sp.filter(s => s.ten_san_pham.toLowerCase().includes(q.toLowerCase()));
    return json(route, { ok: true, data: ds, tong_so_ban_ghi: ds.length, trang: 1, moi_trang: 10 });
  }
  if (p.startsWith('/kho/cong-thuc/')) return json(route, { ok: true, data: { ma_san_pham: 2, ten_san_pham: 'Cà phê sữa', nguyen_lieu: [{ ma_nguyen_lieu: 1, ten_nguyen_lieu: 'Cà phê bột', don_vi_tinh: 'g', dinh_luong: '15.000' }, { ma_nguyen_lieu: 2, ten_nguyen_lieu: 'Sữa đặc', don_vi_tinh: 'g', dinh_luong: '30.000' }] } });
  if (p === '/kho/nguyen-lieu') return json(route, { ok: true, data: nl, tong_so_ban_ghi: 3, trang: 1, moi_trang: 100 });
  return json(route, { ok: false, loi: 'KHONG_TIM_THAY', thong_bao: `chưa giả lập ${pt} ${p}` }, 404);
});

const kiemTra = (dieuKien, mota) => { if (!dieuKien) { console.error('FAIL:', mota); process.exitCode = 1; } else console.log('ok  :', mota); };

await trang.goto(GOC);
await trang.waitForURL('**/dang-nhap');
await trang.screenshot({ path: RA + '1-dang-nhap.png' });
await trang.fill('#ten', 'quanly'); await trang.fill('#mk', 'sai'); await trang.click('button[type=submit]');
kiemTra(await trang.getByRole('alert').filter({ hasText: 'Sai tên đăng nhập' }).count() === 1, 'đăng nhập sai hiện lỗi');
await trang.fill('#mk', 'dung'); await trang.click('button[type=submit]');
await trang.waitForURL('**/san-pham');
await trang.locator('tbody tr').first().waitFor();
kiemTra(await trang.locator('tbody tr').count() === 8, 'bảng có 8 sản phẩm');
kiemTra(await trang.getByText('Tài khoản và quyền').count() === 0, 'quản lý không thấy mục Tài khoản và quyền');
kiemTra(await trang.locator('tbody tr', { hasText: 'Croissant' }).getByText('Ngừng bán').count() === 1, 'Croissant ngừng bán');
await trang.locator('tbody tr', { hasText: 'Cà phê sữa' }).click();
await trang.getByText('Cà phê bột').first().waitFor();
kiemTra(await trang.getByRole('complementary', { name: 'Sửa sản phẩm' }).count() === 1, 'mở panel sửa');
await trang.screenshot({ path: RA + '2-san-pham.png' });
await trang.fill('#tk', 'trà'); await trang.waitForTimeout(600);
kiemTra(await trang.locator('tbody tr').count() === 2, 'tìm "trà" còn 2 dòng');
await trang.setViewportSize({ width: 390, height: 800 });
await trang.waitForTimeout(500); // chờ hiệu ứng trượt của menu
await trang.screenshot({ path: RA + '3-di-dong.png' });
kiemTra(loiConsole.length === 0, `không có lỗi console (${loiConsole.join(' | ')})`);
await trinhDuyet.close();
