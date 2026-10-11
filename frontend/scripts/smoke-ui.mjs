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
const nlKho = [[1, 'Trân châu', 'g', 800, 1000], [2, 'Trà đen', 'g', 2000, 500], [3, 'Sữa đặc', 'g', 4000, 1000], [4, 'Cà phê bột', 'g', 5000, 1000], [5, 'Đường', 'g', 6000, 1500], [6, 'Sữa tươi', 'ml', 8000, 2000]]
  .map(([m, t, d, ton, min]) => ({ ma_nguyen_lieu: m, ten_nguyen_lieu: t, don_vi_tinh: d, so_luong_ton: ton.toFixed(3), muc_ton_toi_thieu: min.toFixed(3), sap_het: ton <= min }));
const nccKho = [{ ma_ncc: 1, ten_ncc: 'Đại lý Sữa và Nguyên liệu Sài Gòn', so_dien_thoai: '0901234567', dia_chi: 'Quận 5' }, { ma_ncc: 2, ten_ncc: 'Công ty Cà phê Tây Nguyên', so_dien_thoai: null, dia_chi: null }];
const phieu = [{ ma_phieu_nhap: 4, ma_ncc: 1, ten_ncc: nccKho[0].ten_ncc, ma_nhan_vien: 2, ten_nhan_vien: 'Trần Thị Quản Lý', ngay_nhap: '2026-10-10T08:30:00.000Z', tong_tien_nhap: '2250000.00', so_dong: 2 }];
let phieuPost = null;
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
  if (p === '/kho/nguyen-lieu') return json(route, { ok: true, data: nlKho, tong_so_ban_ghi: nlKho.length, trang: 1, moi_trang: 100 });
  if (p === '/kho/nha-cung-cap') return json(route, { ok: true, data: nccKho, tong_so_ban_ghi: nccKho.length, trang: 1, moi_trang: 100 });
  if (p === '/kho/ton-kho') {
    const chi = u.searchParams.get('chi_sap_het') === 'true';
    return json(route, { ok: true, data: [...nlKho].sort((a, b) => Number(b.sap_het) - Number(a.sap_het)).filter(x => !chi || x.sap_het) });
  }
  if (p === '/kho/phieu-nhap' && pt === 'POST') { phieuPost = JSON.parse(route.request().postData()); return json(route, { ok: true, data: { ma_phieu_nhap: 5, tong_tien_nhap: '450000.00', chi_tiet: [], ton_moi: [] } }, 201); }
  if (p === '/kho/phieu-nhap') return json(route, { ok: true, data: phieu, tong_tien_nhap: '2250000.00', tong_so_ban_ghi: 1, trang: 1, moi_trang: 10 });
  if (p === '/kho/phieu-nhap/4') return json(route, { ok: true, data: { ...phieu[0], chi_tiet: [{ ma_nguyen_lieu: 1, ten_nguyen_lieu: 'Trân châu', don_vi_tinh: 'g', so_luong_nhap: '5000.000', don_gia_nhap: '90.00', thanh_tien: '450000.00' }, { ma_nguyen_lieu: 4, ten_nguyen_lieu: 'Cà phê bột', don_vi_tinh: 'g', so_luong_nhap: '10000.000', don_gia_nhap: '180.00', thanh_tien: '1800000.00' }] } });
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
// ---- Cụm Kho ----
await trang.getByRole('link', { name: 'Tồn kho' }).first().click();
await trang.waitForURL('**/kho');
await trang.locator('tbody tr').first().waitFor();
kiemTra(await trang.getByText('Trân châu còn 800 g').count() === 1, 'cảnh báo Trân châu còn 800 g');
kiemTra(await trang.locator('tbody tr').count() === 6, 'tồn kho có 6 nguyên liệu');
kiemTra((await trang.locator('tbody tr').first().innerText()).includes('Trân châu'), 'nguyên liệu sắp hết xếp đầu bảng');
await trang.getByRole('button', { name: 'Lập phiếu nhập' }).first().click();
kiemTra(await trang.getByLabel('Nguyên liệu dòng 1').inputValue() === '1', 'bấm cảnh báo điền sẵn Trân châu vào phiếu');
await trang.getByLabel('Nhà cung cấp').selectOption('1');
await trang.getByLabel('Số lượng dòng 1').fill('5000');
await trang.getByLabel('Đơn giá dòng 1').fill('90');
kiemTra((await trang.locator('.tong-tien').innerText()).includes('450.000đ'), 'tổng tiền phiếu 450.000đ');
await trang.screenshot({ path: RA + '4-ton-kho.png' });
await trang.getByRole('button', { name: 'Lưu phiếu nhập' }).click();
await trang.getByText('Đã lưu phiếu nhập #5').waitFor();
kiemTra(phieuPost?.ma_ncc === 1 && phieuPost.items[0].ma_nguyen_lieu === 1 && phieuPost.items[0].so_luong_nhap === 5000 && phieuPost.items[0].don_gia_nhap === 90, 'gửi đúng nội dung phiếu nhập');
await trang.getByRole('button', { name: 'Lưu phiếu nhập' }).click();
kiemTra(await trang.getByText('Chọn nhà cung cấp').count() >= 1, 'phiếu trống báo lỗi chọn nhà cung cấp');
await trang.getByRole('link', { name: 'Nguyên liệu', exact: true }).click();
await trang.locator('tbody tr', { hasText: 'Đường' }).click();
await trang.getByRole('complementary', { name: 'Sửa nguyên liệu' }).waitFor();
await trang.screenshot({ path: RA + '5-nguyen-lieu.png' });
await trang.getByRole('link', { name: 'Nhà cung cấp', exact: true }).click();
await trang.locator('tbody tr', { hasText: 'Tây Nguyên' }).waitFor();
kiemTra(await trang.locator('tbody tr').count() === 2, 'nhà cung cấp có 2 dòng');
await trang.getByRole('link', { name: 'Nhập hàng' }).click();
await trang.waitForURL('**/kho/lich-su-nhap');
await trang.locator('tbody tr', { hasText: '#4' }).click();
await trang.getByRole('dialog', { name: 'Phiếu nhập #4' }).getByText('1.800.000đ').waitFor();
kiemTra(true, 'chi tiết phiếu nhập #4 hiện đúng thành tiền');
await trang.screenshot({ path: RA + '6-lich-su-nhap.png' });
await trang.keyboard.press('Escape');
await trang.getByRole('link', { name: 'Sản phẩm' }).click();
await trang.setViewportSize({ width: 390, height: 800 });
await trang.waitForTimeout(500); // chờ hiệu ứng trượt của menu
await trang.screenshot({ path: RA + '3-di-dong.png' });
kiemTra(loiConsole.length === 0, `không có lỗi console (${loiConsole.join(' | ')})`);
await trinhDuyet.close();
