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
const ngayTu = n => new Date(Date.now() + n * 864e5).toISOString();
const kmDs = [
  { ma_khuyen_mai: 3, ten_khuyen_mai: 'Khuyến mãi đã hết hạn', loai_giam: 'phan_tram', gia_tri_giam: '20.00', ngay_bat_dau: ngayTu(-30), ngay_ket_thuc: ngayTu(-1), trang_thai: 'het_han', so_san_pham: 1, so_luot_dung: '0' },
  { ma_khuyen_mai: 2, ten_khuyen_mai: 'Giảm 5.000đ trà sữa', loai_giam: 'so_tien', gia_tri_giam: '5000.00', ngay_bat_dau: ngayTu(-1), ngay_ket_thuc: ngayTu(30), trang_thai: 'dang_chay', so_san_pham: 1, so_luot_dung: '4' },
  { ma_khuyen_mai: 1, ten_khuyen_mai: 'Giảm 10% cà phê', loai_giam: 'phan_tram', gia_tri_giam: '10.00', ngay_bat_dau: ngayTu(-1), ngay_ket_thuc: ngayTu(30), trang_thai: 'dang_chay', so_san_pham: 3, so_luot_dung: '12' },
];
let kmPost = null;
const cong = (t, n) => { const d = new Date(`${t}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const bcReq = {};
const thuHaiNode = t => { const d = new Date(`${t}T12:00:00Z`); return cong(t, -((d.getUTCDay() + 6) % 7)); };
let caPost = null; let pcPost = null; let pcGo = null; let lichLoc = null; let nvPost = null; let nvPatch = null; let nvXoa = null;
const nvDs = [
  { ma_nhan_vien: 1, ho_ten: 'Lê Quản Trị', chuc_vu: 'Chủ quán', so_dien_thoai: '0900000001', trang_thai: 'dang_lam', ma_tai_khoan: 1, ten_dang_nhap: 'admin', quyen_truy_cap: 'admin' },
  { ma_nhan_vien: 2, ho_ten: 'Trần Thị Quản Lý', chuc_vu: 'Quản lý', so_dien_thoai: '0900000002', trang_thai: 'dang_lam', ma_tai_khoan: 2, ten_dang_nhap: 'quanly', quyen_truy_cap: 'quan_ly' },
  { ma_nhan_vien: 3, ho_ten: 'Phạm Văn Nhân Viên', chuc_vu: 'Pha chế', so_dien_thoai: null, trang_thai: 'dang_lam', ma_tai_khoan: 3, ten_dang_nhap: 'nhanvien', quyen_truy_cap: 'nhan_vien' },
  { ma_nhan_vien: 4, ho_ten: 'Đỗ Thị Thu Ngân', chuc_vu: 'Thu ngân', so_dien_thoai: '0900000004', trang_thai: 'dang_lam', ma_tai_khoan: null, ten_dang_nhap: null, quyen_truy_cap: null },
];
const caDs = [{ ma_ca: 1, ten_ca: 'Ca sáng', thoi_gian_bat_dau: '06:00:00', thoi_gian_ket_thuc: '12:00:00', so_phan_cong: 4 }, { ma_ca: 2, ten_ca: 'Ca chiều', thoi_gian_bat_dau: '12:00:00', thoi_gian_ket_thuc: '18:00:00', so_phan_cong: 0 }];
let hdLoc = null; let hdNgay = null; let hdMo = null;
let khPost = null; let khPatch = null; let khLoc = null;
const khDs = [{ ma_khach_hang: 1, ten_khach_hang: 'Nguyễn Văn An', so_dien_thoai: '0901111111', diem_tich_luy: 18 }, { ma_khach_hang: 2, ten_khach_hang: 'Trần Thị Bích', so_dien_thoai: '0902222222', diem_tich_luy: 41 }];
const nguoi = { ma_tai_khoan: 1, ma_nhan_vien: 2, ho_ten: 'Trần Thị Quản Lý', quyen_truy_cap: 'quan_ly' };
const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const trinhDuyet = await chromium.launch();
const trang = await trinhDuyet.newPage({ viewport: { width: 1360, height: 900 } });
const loiConsole = [];
trang.on('pageerror', e => loiConsole.push(e.message));
// Bỏ qua: tải font Google bị chặn trong sandbox, và 401/409 do chính bài test cố ý gây ra
trang.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|ERR_NAME|fonts\.g|401|409/.test(m.text())) loiConsole.push(m.text()); });

await trang.route('**/api/**', route => {
  const u = new URL(route.request().url());
  const p = u.pathname.replace(/^.*\/api/, ''); const pt = route.request().method();
  if (p === '/auth/dang-nhap') {
    const b = JSON.parse(route.request().postData() || '{}');
    return b.mat_khau === 'dung' ? json(route, { ok: true, data: { token: 't', nguoi_dung: nguoi } })
      : json(route, { ok: false, loi: 'SAI_THONG_TIN', thong_bao: 'Sai tên đăng nhập hoặc mật khẩu' }, 401);
  }
  if (p === '/auth/toi') return json(route, { ok: true, data: nguoi });
  if (p === '/he-thong/trang-an') return json(route, { ok: true, data: { trang_an: {} } }); // không ẩn trang nào (phần ẩn trang có smoke-trang-an.mjs riêng)
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
  if (p === '/khuyen-mai' && pt === 'POST') { kmPost = JSON.parse(route.request().postData()); return json(route, { ok: true, data: { ...kmDs[2], ma_khuyen_mai: 4, ten_khuyen_mai: kmPost.ten_khuyen_mai, san_pham: [] } }, 201); }
  if (p === '/khuyen-mai') return json(route, { ok: true, data: kmDs, tong_so_ban_ghi: 3, trang: 1, moi_trang: 10 });
  if (p === '/khuyen-mai/1' && pt === 'GET') return json(route, { ok: true, data: { ...kmDs[2], san_pham: sp.slice(0, 3) } });
  if (p === '/khuyen-mai/1/bao-cao') return json(route, { ok: true, data: { so_hoa_don: 9, so_luong_ban: 12, tong_tien_giam: 34800, doanh_thu_sau_giam: 313200 } });
  if (p === '/khuyen-mai/1' && pt === 'DELETE') return json(route, { ok: false, loi: 'KHUYEN_MAI_DA_DUOC_DUNG', thong_bao: 'Khuyến mãi đã được áp trong hóa đơn nên không xóa được; hãy đặt ngay_ket_thuc về thời điểm hiện tại để ngừng áp dụng' }, 409);
  if (p.startsWith('/bao-cao/')) {
    const q = Object.fromEntries(u.searchParams); bcReq[p] = q;
    if (q.den_ngay === '2000-01-01') return json(route, { ok: true, data: [] });
    const homN = new Date().toISOString().slice(0, 10); const t = q.tu_ngay || homN;
    const kyDs = q.nhom === 'thang' ? [t.slice(0, 7)] : q.nhom === 'tuan' ? [thuHaiNode(t), thuHaiNode(homN)] : [t, cong(t, 1), cong(t, 2), homN];
    if (p === '/bao-cao/doanh-thu') return json(route, { ok: true, data: [...new Set(kyDs)].map((ky, i) => ({ ky, so_don: 10 + i, doanh_thu: 1000000 + i * 250000 })) });
    if (p === '/bao-cao/san-pham-ban-chay') return json(route, { ok: true, data: sp.slice(0, 6).map((s2, i) => ({ ma_san_pham: s2.ma_san_pham, ten_san_pham: s2.ten_san_pham, so_luong: 168 - i * 20, doanh_thu: (168 - i * 20) * 29000 })).slice(0, Number(q.top || 10)) });
    if (p === '/bao-cao/doanh-thu-theo-danh-muc') return json(route, { ok: true, data: [{ ma_danh_muc: 1, ten_danh_muc: 'Cà phê', doanh_thu: 6000000, ty_le: 60 }, { ma_danh_muc: 2, ten_danh_muc: 'Trà', doanh_thu: 3000000, ty_le: 30 }, { ma_danh_muc: 4, ten_danh_muc: 'Bánh', doanh_thu: 1000000, ty_le: 10 }] });
    if (p === '/bao-cao/phuong-thuc-thanh-toan') return json(route, { ok: true, data: [{ phuong_thuc: 'tien_mat', so_don: 30, tong_tien: 6000000 }, { phuong_thuc: 'chuyen_khoan', so_don: 15, tong_tien: 3000000 }, { phuong_thuc: 'vi', so_don: 5, tong_tien: 1000000 }] });
    if (p === '/bao-cao/chi-phi-vs-doanh-thu') return json(route, { ok: true, data: [...new Set(kyDs)].map((ky, i) => ({ ky, doanh_thu: 1000000 + i * 100000, chi_phi_nhap: i === 1 ? 2250000 : 0, chenh_lech: 1000000 + i * 100000 - (i === 1 ? 2250000 : 0) })) });
    if (p === '/bao-cao/doanh-thu-theo-nhan-vien') return json(route, { ok: true, data: [{ ma_nhan_vien: 3, ho_ten: 'Phạm Văn Nhân Viên', so_don: 40, doanh_thu: 7000000 }, { ma_nhan_vien: 2, ho_ten: 'Trần Thị Quản Lý', so_don: 10, doanh_thu: 3000000 }] });
  }
  if (p === '/nhan-su/ca-lam-viec' && pt === 'POST') { caPost = JSON.parse(route.request().postData()); return json(route, { ok: true, data: { ma_ca: 3, ...caPost, thoi_gian_bat_dau: caPost.thoi_gian_bat_dau + ':00', thoi_gian_ket_thuc: caPost.thoi_gian_ket_thuc + ':00' } }, 201); }
  if (p === '/nhan-su/ca-lam-viec') return json(route, { ok: true, data: caDs });
  if (p === '/nhan-su/ca-lam-viec/1' && pt === 'DELETE') return json(route, { ok: false, loi: 'CA_DA_CO_PHAN_CONG', thong_bao: 'Ca đã có phân công, không thể xóa' }, 409);
  if (p === '/nhan-su/phan-cong' && pt === 'POST') { pcPost = JSON.parse(route.request().postData()); return json(route, { ok: true, data: [] }, 201); }
  if (p === '/nhan-su/phan-cong' && pt === 'DELETE') { pcGo = Object.fromEntries(u.searchParams); return json(route, { ok: true, data: { da_xoa: true } }); }
  if (p === '/nhan-su/lich-tuan') { lichLoc = Object.fromEntries(u.searchParams); const t = u.searchParams.get('tu_ngay'); return json(route, { ok: true, tu_ngay: t, den_ngay: cong(t, 6), data: [{ ngay_lam: t, ma_ca: 1, ten_ca: 'Ca sáng', thoi_gian_bat_dau: '06:00:00', thoi_gian_ket_thuc: '12:00:00', ma_nhan_vien: 3, ho_ten: 'Phạm Văn Nhân Viên' }] }); }
  if (p === '/nhan-su' && pt === 'POST') { nvPost = JSON.parse(route.request().postData()); return nvPost.ten_dang_nhap === 'trung' ? json(route, { ok: false, loi: 'TRUNG_TEN_DANG_NHAP', thong_bao: 'Tên đăng nhập đã tồn tại' }, 409) : json(route, { ok: true, data: { ma_nhan_vien: 9, ...nvPost, chuc_vu: nvPost.chuc_vu, trang_thai: 'dang_lam', ma_tai_khoan: 9 } }, 201); }
  if (p === '/nhan-su') {
    const q = (u.searchParams.get('tu_khoa') || '').toLowerCase(); const tt = u.searchParams.get('trang_thai'); const qu = u.searchParams.get('quyen_truy_cap');
    const ds = nvDs.filter(n => (!q || n.ho_ten.toLowerCase().includes(q) || (n.ten_dang_nhap || '').includes(q)) && (!tt || n.trang_thai === tt) && (!qu || n.quyen_truy_cap === qu));
    return json(route, { ok: true, data: ds, tong_so_ban_ghi: ds.length, trang: 1, moi_trang: 10 });
  }
  if (/^\/nhan-su\/\d+$/.test(p) && pt === 'PATCH') { nvPatch = JSON.parse(route.request().postData()); return json(route, { ok: true, data: { ...nvDs.find(n => `/nhan-su/${n.ma_nhan_vien}` === p), ...nvPatch } }); }
  if (/^\/nhan-su\/\d+$/.test(p) && pt === 'DELETE') { nvXoa = p; return json(route, { ok: true, data: { da_xoa: false, trang_thai: 'nghi_viec' } }); }
  if (p === '/khach-hang' && pt === 'POST') { khPost = JSON.parse(route.request().postData()); return khPost.so_dien_thoai === '0901111111' ? json(route, { ok: false, loi: 'TRUNG_SDT', thong_bao: 'Số điện thoại đã tồn tại' }, 409) : json(route, { ok: true, data: { ma_khach_hang: 9, ...khPost, diem_tich_luy: 0 } }, 201); }
  if (p === '/khach-hang/top') return json(route, { ok: true, data: [{ ma_khach_hang: 2, ten: 'Trần Thị Bích', so_dien_thoai: '0902222222', so_don: 5, tong_chi_tieu: 410000 }, { ma_khach_hang: 1, ten: 'Nguyễn Văn An', so_dien_thoai: '0901111111', so_don: 3, tong_chi_tieu: 180000 }] });
  if (/^\/khach-hang\/\d+\/lich-su$/.test(p) && p !== '/khach-hang/1/lich-su') return json(route, { ok: true, data: [], khach_hang: khDs[0], tong_chi_tieu: 0, tong_so_ban_ghi: 0, trang: 1, moi_trang: 5 });
  if (p === '/khach-hang/1/lich-su') { khLoc = Object.fromEntries(u.searchParams); return json(route, { ok: true, data: [{ ma_hoa_don: 11, so_thu_tu: 3, thoi_gian_tao: ngayTu(-2), thoi_gian_thanh_toan: ngayTu(-2), phuong_thuc_thanh_toan: 'chuyen_khoan', tong_tien_hang: 70000, tong_giam_gia: 5000, tong_tien: 65000, diem_cong: 6 }], khach_hang: khDs[0], tong_chi_tieu: 180000, tong_so_ban_ghi: 3, trang: 1, moi_trang: 5 }); }
  if (p === '/khach-hang/1' && pt === 'PATCH') { khPatch = JSON.parse(route.request().postData()); return json(route, { ok: true, data: { ...khDs[0], ...khPatch } }); }
  if (p === '/khach-hang') { const q = (u.searchParams.get('tu_khoa') || '').toLowerCase(); return json(route, { ok: true, data: khDs.filter(k => k.ten_khach_hang.toLowerCase().includes(q) || k.so_dien_thoai.includes(q)) }); }
  if (p === '/hoa-don' || /^\/hoa-don\/\d+$/.test(p)) {
    const gio = h => `${hdNgay}T${h}:00`;
    if (p === '/hoa-don') {
      hdLoc = Object.fromEntries(u.searchParams); hdNgay = hdLoc.ngay || homNayStr;
      const ds = [
        { ma_hoa_don: 21, so_thu_tu: 1, thoi_gian_tao: gio('07:45'), trang_thai: 'da_thanh_toan', phuong_thuc_thanh_toan: 'tien_mat', ma_khach_hang: 1, ten_khach_hang: 'Nguyễn Văn An', ma_nhan_vien: 3, ten_nhan_vien: 'Phạm Văn Nhân Viên', so_mon: 3, tong_tien: 87000 },
        { ma_hoa_don: 22, so_thu_tu: 2, thoi_gian_tao: gio('08:10'), trang_thai: 'da_thanh_toan', phuong_thuc_thanh_toan: 'chuyen_khoan', ma_khach_hang: null, ten_khach_hang: null, ma_nhan_vien: 4, ten_nhan_vien: 'Đỗ Thị Thu Ngân', so_mon: 1, tong_tien: 35000 },
        { ma_hoa_don: 23, so_thu_tu: 3, thoi_gian_tao: gio('09:30'), trang_thai: 'dang_pha_che', phuong_thuc_thanh_toan: null, ma_khach_hang: null, ten_khach_hang: null, ma_nhan_vien: 3, ten_nhan_vien: 'Phạm Văn Nhân Viên', so_mon: 2, tong_tien: 64000 },
        { ma_hoa_don: 24, so_thu_tu: 4, thoi_gian_tao: gio('10:05'), trang_thai: 'huy', phuong_thuc_thanh_toan: null, ma_khach_hang: null, ten_khach_hang: null, ma_nhan_vien: 3, ten_nhan_vien: 'Phạm Văn Nhân Viên', so_mon: 1, tong_tien: 29000 },
      ].filter(d => (!hdLoc.trang_thai || d.trang_thai === hdLoc.trang_thai) && (!hdLoc.ma_nhan_vien || String(d.ma_nhan_vien) === hdLoc.ma_nhan_vien));
      return json(route, { ok: true, data: ds, tong_so_ban_ghi: ds.length, trang: 1, moi_trang: 200 });
    }
    hdMo = p;
    return json(route, { ok: true, data: { ma_hoa_don: 21, so_thu_tu: 1, thoi_gian_tao: gio('07:45'), trang_thai: 'da_thanh_toan', phuong_thuc_thanh_toan: 'tien_mat', ten_khach_hang: 'Nguyễn Văn An', ten_nhan_vien: 'Phạm Văn Nhân Viên',
      tong_tien_hang: 93000, tong_giam_gia: 6000, tong_tien_tam_tinh: 87000, tong_tien: 87000,
      chi_tiet: [{ ma_chi_tiet: 1, ma_san_pham: 2, ten_san_pham: 'Cà phê sữa', so_luong: 2, don_gia: 29000, giam_gia: 6000, ghi_chu: 'ít đường', thanh_tien: 52000, khuyen_mai: [{ ma_khuyen_mai: 1, ten_khuyen_mai: 'Giảm 10% cà phê', muc_giam_moi_ly: 3000 }] },
        { ma_chi_tiet: 2, ma_san_pham: 4, ten_san_pham: 'Trà đào cam sả', so_luong: 1, don_gia: 35000, giam_gia: 0, ghi_chu: null, thanh_tien: 35000, khuyen_mai: [] }] } });
  }
  return json(route, { ok: false, loi: 'KHONG_TIM_THAY', thong_bao: `chưa giả lập ${pt} ${p}` }, 404);
});

const kiemTra = (dieuKien, mota) => { if (!dieuKien) { console.error('FAIL:', mota); process.exitCode = 1; } else console.log('ok  :', mota); };

await trang.goto(GOC);
await trang.waitForURL('**/dang-nhap');
await trang.screenshot({ path: RA + '1-dang-nhap.png' });
await trang.fill('#ten', 'quanly'); await trang.fill('#mk', 'sai'); await trang.click('button[type=submit]');
await trang.getByRole('alert').filter({ hasText: 'Sai tên đăng nhập' }).waitFor(); // chờ phản hồi giả
kiemTra(true, 'đăng nhập sai hiện lỗi');
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
await trang.getByLabel('Nguyên liệu dòng 1').locator('option[value="1"]').waitFor({ state: 'attached' }); // chờ danh sách nguyên liệu tải xong
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
// ---- Khuyến mãi ----
await trang.getByRole('link', { name: 'Khuyến mãi' }).click();
await trang.waitForURL('**/khuyen-mai');
await trang.locator('tbody tr').first().waitFor();
kiemTra(await trang.locator('tbody tr').count() === 3, 'khuyến mãi có 3 dòng');
kiemTra(await trang.locator('tbody tr', { hasText: 'hết hạn' }).getByText('Hết hạn', { exact: true }).count() === 1, 'khuyến mãi cũ hiện chip Hết hạn');
await trang.locator('tbody tr', { hasText: 'Giảm 10% cà phê' }).click();
await trang.getByRole('complementary', { name: 'Sửa khuyến mãi' }).waitFor();
await trang.locator('.ds-doc').getByText('Cà phê đen').waitFor();
await trang.getByText('313.200đ').waitFor();
kiemTra(await trang.getByLabel('Gỡ Cà phê sữa').count() === 1, 'panel liệt kê sản phẩm áp dụng, có nút gỡ');
kiemTra(await trang.getByText('34.800đ').count() === 1, 'hiệu quả hiện tiền đã giảm 34.800đ');
await trang.screenshot({ path: RA + '7-khuyen-mai.png' });
await trang.getByRole('button', { name: 'Xóa khuyến mãi' }).click();
await trang.getByRole('dialog').getByRole('button', { name: 'Xóa' }).click();
await trang.getByRole('button', { name: 'Ngừng áp dụng ngay' }).waitFor();
kiemTra(true, 'xóa khuyến mãi đã dùng: báo 409 kèm nút Ngừng áp dụng ngay');
await trang.getByRole('button', { name: 'Thêm khuyến mãi' }).click();
await trang.getByRole('button', { name: 'Tạo khuyến mãi' }).click();
kiemTra(await trang.getByText('Nhập tên khuyến mãi').count() === 1, 'tạo khuyến mãi trống báo thiếu tên');
await trang.getByLabel('Tên khuyến mãi').fill('Giảm 3 món');
await trang.getByLabel('Giảm (%)').fill('15');
await trang.getByLabel('Bạc xỉu').check();
await trang.getByRole('button', { name: 'Tạo khuyến mãi' }).click();
await trang.getByText('Đã tạo khuyến mãi').waitFor();
kiemTra(kmPost?.loai_giam === 'phan_tram' && kmPost.gia_tri_giam === 15 && kmPost.ma_san_pham?.[0] === 3 && /Z$/.test(kmPost.ngay_bat_dau), 'gửi đúng nội dung khuyến mãi (có ngày giờ ISO)');
// ---- Khách hàng ----
await trang.getByRole('link', { name: 'Khách hàng' }).first().click();
await trang.waitForURL('**/khach-hang');
kiemTra(await trang.getByText('Nhập tên hoặc số điện thoại để tìm khách').count() === 1, 'chưa nhập từ khóa: hiện hướng dẫn tìm');
await trang.getByLabel('Tìm khách theo tên hoặc số điện thoại').fill('0902');
await trang.locator('tbody tr', { hasText: 'Trần Thị Bích' }).waitFor();
kiemTra(await trang.locator('tbody tr').count() === 1, 'tìm theo SĐT ra 1 khách');
await trang.getByLabel('Tìm khách theo tên hoặc số điện thoại').fill('nguyễn');
await trang.locator('tbody tr', { hasText: 'Nguyễn Văn An' }).click();
await trang.getByRole('complementary', { name: 'Sửa khách hàng' }).waitFor();
await trang.getByText('Hóa đơn #3').waitFor();
kiemTra(await trang.getByText('180.000đ').count() === 1 && await trang.getByText('+6 điểm').count() === 1, 'lịch sử mua hiện tổng chi tiêu và điểm cộng');
await trang.getByLabel('Từ ngày').first().fill('2026-10-01');
await trang.waitForTimeout(400);
kiemTra(khLoc?.tu_ngay === '2026-10-01' && khLoc.trang === '1', 'lọc lịch sử theo ngày gửi tu_ngay, về trang 1');
await trang.screenshot({ path: RA + '8-khach-hang.png' });
await trang.getByLabel('Tên khách hàng').fill('Nguyễn Văn Anh');
await trang.getByRole('button', { name: 'Lưu thay đổi' }).click();
await trang.getByText('Đã lưu thay đổi').waitFor();
kiemTra(khPatch?.ten_khach_hang === 'Nguyễn Văn Anh' && khPatch.so_dien_thoai === '0901111111' && !('diem_tich_luy' in khPatch), 'sửa khách chỉ gửi tên và SĐT, không gửi điểm');
await trang.getByRole('button', { name: 'Thêm khách hàng' }).first().click();
await trang.getByRole('button', { name: 'Thêm khách hàng' }).last().click();
kiemTra(await trang.getByText('Nhập tên khách hàng').count() === 1 && await trang.getByText('Số điện thoại gồm 10 chữ số').count() === 1, 'thêm khách trống báo lỗi tên và SĐT');
await trang.getByLabel('Tên khách hàng').fill('Lê Văn C'); await trang.locator('#kh-sdt').fill('0901111111');
await trang.getByRole('button', { name: 'Thêm khách hàng' }).last().click();
await trang.getByText('Số điện thoại này đã có khách hàng khác').waitFor();
kiemTra(true, 'SĐT trùng (409) báo lỗi ngay ở ô SĐT');
await trang.locator('#kh-sdt').fill('0903333333');
await trang.getByRole('button', { name: 'Thêm khách hàng' }).last().click();
await trang.getByText('Đã thêm khách hàng').waitFor();
kiemTra(khPost?.ten_khach_hang === 'Lê Văn C' && khPost.so_dien_thoai === '0903333333', 'gửi đúng nội dung khách mới');
await trang.getByRole('link', { name: 'Khách thân thiết' }).click();
await trang.locator('tbody tr', { hasText: 'Trần Thị Bích' }).waitFor();
kiemTra((await trang.locator('tbody tr').first().innerText()).includes('410.000đ'), 'khách thân thiết: hạng 1 là Bích 410.000đ');
await trang.screenshot({ path: RA + '9-khach-than-thiet.png' });
// ---- Nhân sự ----
const homNayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
const ngNgan = t => `${t.slice(8)}/${t.slice(5, 7)}`;
await trang.getByRole('link', { name: 'Nhân viên', exact: true }).click();
await trang.waitForURL('**/nhan-vien');
await trang.locator('tbody tr').first().waitFor();
kiemTra(await trang.locator('tbody tr').count() === 4, 'nhân viên có 4 dòng');
kiemTra(await trang.getByRole('button', { name: 'Thêm nhân viên' }).count() === 0, 'quản lý không thấy nút Thêm nhân viên');
await trang.locator('tbody tr', { hasText: 'Lê Quản Trị' }).click();
await trang.getByText('Quản lý không sửa được thông tin của tài khoản admin').waitFor();
kiemTra(await trang.getByRole('button', { name: 'Lưu thay đổi' }).count() === 0, 'quản lý xem admin: form bị khóa, không có nút lưu');
await trang.locator('tbody tr', { hasText: 'Phạm Văn' }).click();
await trang.locator('#nv-sdt').fill('0912345678');
await trang.getByRole('button', { name: 'Lưu thay đổi' }).click();
await trang.getByText('Đã lưu thay đổi').last().waitFor();
kiemTra(nvPatch?.so_dien_thoai === '0912345678' && nvPatch.ho_ten === 'Phạm Văn Nhân Viên' && !('quyen_truy_cap' in nvPatch) && !('mat_khau' in nvPatch), 'quản lý sửa nhân viên: chỉ gửi họ tên, chức vụ, SĐT');
await trang.screenshot({ path: RA + '10-nhan-vien.png' });
// chuyển sang admin
nguoi.quyen_truy_cap = 'admin'; nguoi.ma_nhan_vien = 1; await trang.reload();
await trang.getByRole('button', { name: 'Thêm nhân viên' }).waitFor();
await trang.getByRole('button', { name: 'Thêm nhân viên' }).click();
await trang.getByRole('button', { name: 'Thêm nhân viên' }).last().click();
kiemTra(await trang.getByText('Nhập họ tên').count() === 1 && await trang.getByText('Tên đăng nhập 3–50 ký tự').count() === 1, 'thêm nhân viên trống báo lỗi họ tên và tên đăng nhập');
await trang.locator('#nv-ten').fill('Vũ Thị Mới'); await trang.locator('#nv-cv').fill('Phục vụ'); await trang.locator('#nv-dn').fill('trung'); await trang.locator('#nv-mk').fill('abcdefgh');
await trang.getByRole('button', { name: 'Thêm nhân viên' }).last().click();
kiemTra(await trang.getByText('Mật khẩu cần ít nhất một chữ cái và một chữ số').count() === 1, 'mật khẩu thiếu chữ số bị chặn ở client');
await trang.locator('#nv-mk').fill('abcd1234');
await trang.getByRole('button', { name: 'Thêm nhân viên' }).last().click();
await trang.getByText('Tên đăng nhập này đã có người dùng').waitFor();
kiemTra(true, 'tên đăng nhập trùng (409) báo ngay ở ô tên đăng nhập');
await trang.locator('#nv-dn').fill('vumoi');
await trang.getByRole('button', { name: 'Thêm nhân viên' }).last().click();
await trang.getByText('Đã thêm nhân viên').waitFor();
kiemTra(nvPost?.ten_dang_nhap === 'vumoi' && nvPost.mat_khau === 'abcd1234' && nvPost.quyen_truy_cap === 'nhan_vien' && !('so_dien_thoai' in nvPost), 'gửi đúng nội dung nhân viên mới (SĐT bỏ trống thì không gửi)');
await trang.locator('tbody tr', { hasText: 'Trần Thị Quản Lý' }).click();
kiemTra(await trang.getByText('Bạn không thể tự xóa hoặc cho chính mình nghỉ việc').count() === 0, 'admin (mã 1) chọn quản lý: có nút xóa');
await trang.locator('tbody tr', { hasText: 'Phạm Văn' }).click();
await trang.getByRole('button', { name: 'Xóa hoặc cho nghỉ việc' }).click();
await trang.getByRole('dialog').getByRole('button', { name: 'Xác nhận' }).click();
await trang.getByText('Nhân viên đã có lịch sử nên được chuyển sang nghỉ việc').waitFor();
kiemTra(nvXoa === '/nhan-su/3', 'xóa nhân viên đã có lịch sử: báo đã chuyển sang nghỉ việc');
// ---- Tài khoản và quyền ----
await trang.getByRole('link', { name: 'Tài khoản và quyền' }).click();
await trang.waitForURL('**/tai-khoan');
await trang.locator('tbody tr').first().waitFor();
await trang.locator('tbody tr', { hasText: 'nhanvien' }).click();
await trang.getByRole('complementary', { name: 'Sửa tài khoản' }).waitFor();
kiemTra(await trang.getByRole('button', { name: 'Lưu quyền' }).isDisabled(), 'chưa đổi quyền thì nút Lưu quyền bị khóa');
await trang.getByRole('radio', { name: 'Quản lý' }).check();
await trang.getByRole('button', { name: 'Lưu quyền' }).click();
await trang.getByText('Đã đổi quyền').waitFor();
kiemTra(nvPatch?.quyen_truy_cap === 'quan_ly' && Object.keys(nvPatch).length === 1, 'đổi quyền chỉ gửi quyen_truy_cap');
await trang.locator('#tk-mk').fill('12345678');
await trang.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
kiemTra(await trang.getByText('Mật khẩu cần ít nhất một chữ cái và một chữ số').count() === 1, 'đặt lại mật khẩu yếu bị chặn');
await trang.locator('#tk-mk').fill('matkhau123');
await trang.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
await trang.getByText('Đã đặt lại mật khẩu').waitFor();
kiemTra(nvPatch?.mat_khau === 'matkhau123' && Object.keys(nvPatch).length === 1, 'đặt lại mật khẩu chỉ gửi mat_khau');
await trang.screenshot({ path: RA + '11-tai-khoan.png' });
// ---- Lịch làm việc ----
await trang.getByRole('link', { name: 'Lịch làm việc' }).click();
await trang.waitForURL('**/lich-lam-viec');
await trang.locator('.the-nv').first().waitFor();
kiemTra(await trang.locator('table.lich tbody tr').count() === 2, 'lịch tuần có 2 hàng ca');
kiemTra(lichLoc?.tu_ngay && new Date(`${lichLoc.tu_ngay}T12:00:00Z`).getUTCDay() === 1, 'gửi tu_ngay là thứ Hai');
const tuan1 = lichLoc.tu_ngay;
await trang.getByRole('button', { name: 'Tuần sau' }).click();
await trang.waitForTimeout(300);
kiemTra(lichLoc.tu_ngay === cong(tuan1, 7), 'bấm Tuần sau gửi tu_ngay cộng 7 ngày');
await trang.getByRole('button', { name: 'Tuần này' }).click();
await trang.waitForTimeout(300);
await trang.getByRole('button', { name: `Xếp người vào Ca sáng ngày ${ngNgan(homNayStr)}` }).click();
await trang.getByRole('button', { name: 'Xếp lịch' }).last().click();
kiemTra(await trang.locator('.loi-truong', { hasText: 'Chọn nhân viên' }).count() === 1, 'xếp lịch chưa chọn nhân viên báo lỗi');
await trang.getByLabel('Nhân viên', { exact: true }).selectOption('3');
await trang.getByLabel('Lặp lại').selectOption('2');
kiemTra(await trang.getByText(/Sẽ xếp 2 ngày/).count() === 1, 'lặp 2 tuần từ ô hôm nay: 2 ngày');
await trang.screenshot({ path: RA + '12-xep-lich.png' });
await trang.getByRole('button', { name: 'Xếp lịch' }).last().click();
await trang.getByText('Đã xếp 2 ngày').waitFor();
kiemTra(pcPost?.ma_nhan_vien === 3 && pcPost.ma_ca === 1 && pcPost.ngay_lam[0] === homNayStr && pcPost.ngay_lam[1] === cong(homNayStr, 7), 'gửi đúng nhân viên, ca, 2 ngày cách nhau 7 ngày');
await trang.getByRole('button', { name: /^Gỡ Phạm Văn Nhân Viên khỏi Ca sáng/ }).first().click();
await trang.getByRole('dialog').getByRole('button', { name: 'Gỡ' }).click();
await trang.getByText('Đã gỡ khỏi ca').waitFor();
kiemTra(pcGo?.ma_nhan_vien === '3' && pcGo.ma_ca === '1' && /^\d{4}-\d{2}-\d{2}$/.test(pcGo.ngay_lam), 'gỡ phân công gửi đủ nhân viên, ca, ngày qua query');
await trang.screenshot({ path: RA + '13-lich-tuan.png' });
await trang.getByRole('link', { name: 'Ca làm việc' }).click();
await trang.locator('tbody tr', { hasText: 'Ca chiều' }).waitFor();
kiemTra(await trang.locator('tbody tr').count() === 2, 'tab ca có 2 ca');
await trang.getByRole('button', { name: 'Thêm ca' }).first().click();
await trang.locator('#ca-ten').fill('Ca đêm'); await trang.locator('#ca-bd').fill('20:00'); await trang.locator('#ca-kt').fill('18:00');
await trang.getByRole('button', { name: 'Thêm ca' }).last().click();
kiemTra(await trang.getByText(/Giờ kết thúc phải sau giờ bắt đầu/).count() === 1, 'ca có giờ kết thúc trước giờ bắt đầu bị chặn');
await trang.locator('#ca-kt').fill('23:00');
await trang.getByRole('button', { name: 'Thêm ca' }).last().click();
await trang.getByText('Đã thêm ca').waitFor();
kiemTra(caPost?.thoi_gian_bat_dau === '20:00' && caPost.thoi_gian_ket_thuc === '23:00', 'gửi đúng giờ ca dạng HH:mm');
await trang.locator('tbody tr', { hasText: 'Ca sáng' }).click();
await trang.getByRole('button', { name: 'Xóa ca' }).click();
await trang.getByRole('dialog').getByRole('button', { name: 'Xóa' }).click();
await trang.getByText('Ca đã có phân công, không thể xóa').waitFor();
kiemTra(true, 'xóa ca đã có phân công: hiện thông báo 409');
// ---- Báo cáo ----
await trang.getByRole('link', { name: 'Báo cáo', exact: true }).first().click();
await trang.waitForURL('**/bao-cao');
await trang.locator('.chi-so').waitFor();
await trang.getByText('Bán chạy nhất').waitFor();
await trang.locator('.chi-so', { hasText: '5.500.000đ' }).waitFor(); // chờ dữ liệu giả tải xong
const soNgayThang = Number(homNayStr.slice(8));
kiemTra(bcReq['/bao-cao/doanh-thu']?.tu_ngay === homNayStr.slice(0, 8) + '01' && bcReq['/bao-cao/doanh-thu'].den_ngay === homNayStr && bcReq['/bao-cao/doanh-thu'].nhom === 'ngay', 'mặc định từ đầu tháng đến hôm nay, gom theo ngày');
kiemTra((await trang.locator('.chi-so').innerText()).includes('5.500.000đ') && (await trang.locator('.chi-so').innerText()).includes('46'), 'dải số liệu: doanh thu 5.500.000đ, 46 đơn');
kiemTra((await trang.locator('.chi-so').innerText()).includes('119.565đ'), 'trung bình mỗi đơn 119.565đ');
kiemTra(await trang.locator('.bd-khung svg rect[fill="transparent"]').count() === soNgayThang, `biểu đồ có đủ ${soNgayThang} cột ngày (kỳ không có đơn điền 0)`);
await trang.locator('.bd-khung svg rect[fill="transparent"]').last().focus();
await trang.locator('.bd-tip').waitFor();
kiemTra((await trang.locator('.bd-tip').innerText()).includes('chưa hết') && (await trang.locator('.bd-tip').innerText()).includes('1.750.000đ'), 'rê/focus cột hôm nay: chú giải ghi "chưa hết" và doanh thu');
kiemTra(await trang.locator('.bd-khung svg path[fill-opacity="0.45"]').count() === 1, 'chỉ cột hôm nay được vẽ nhạt');
await trang.screenshot({ path: RA + '14-bao-cao.png' });
await trang.getByRole('button', { name: 'Bảng', exact: true }).click();
kiemTra(await trang.getByRole('table', { name: 'Doanh thu theo kỳ' }).locator('tbody tr').count() === soNgayThang && await trang.getByText('Trung bình mỗi đơn').count() >= 2, 'chuyển sang Bảng: đủ dòng và có cột trung bình mỗi đơn');
await trang.getByRole('button', { name: 'Biểu đồ', exact: true }).click();
kiemTra(await trang.getByRole('table', { name: 'Top 5 sản phẩm bán chạy' }).locator('tbody tr').count() === 5 && bcReq['/bao-cao/san-pham-ban-chay'].top === '5', 'khung Bán chạy nhất lấy top 5 cùng khoảng ngày');
// bộ lọc
await trang.locator('#bc-tu').fill('2026-10-01'); await trang.locator('#bc-den').fill('2026-09-01');
kiemTra(await trang.getByText('“Từ ngày” đang sau “Đến ngày”').count() === 1 && await trang.getByRole('button', { name: 'Xem báo cáo' }).isDisabled(), 'từ ngày sau đến ngày: báo lỗi và khóa nút');
await trang.locator('#bc-den').fill(homNayStr); await trang.locator('#bc-tu').fill('2026-10-05');
await trang.getByLabel('Tuần', { exact: true }).check();
await trang.getByRole('button', { name: 'Xem báo cáo' }).click();
await trang.waitForTimeout(400);
kiemTra(bcReq['/bao-cao/doanh-thu'].tu_ngay === '2026-10-05' && bcReq['/bao-cao/doanh-thu'].nhom === 'tuan', 'bấm Xem báo cáo: gửi khoảng ngày mới và nhom=tuan');
kiemTra(await trang.getByRole('heading', { name: 'Doanh thu theo tuần' }).count() === 1, 'tiêu đề đổi theo tuần');
// các tab
await trang.getByRole('link', { name: 'Xem tất cả sản phẩm' }).click();
await trang.waitForURL('**/bao-cao/san-pham');
await trang.locator('.hbar li').first().waitFor();
kiemTra(await trang.locator('.hbar li').count() === 6 && bcReq['/bao-cao/san-pham-ban-chay'].top === '10' && bcReq['/bao-cao/san-pham-ban-chay'].tu_ngay === '2026-10-05', 'tab Sản phẩm bán chạy: 6 thanh, top 10, giữ khoảng ngày đã chọn');
kiemTra((await trang.locator('.hbar li').first().innerText()).includes('168 ly'), 'thanh đầu ghi số ly ở đầu thanh');
await trang.getByRole('link', { name: 'Theo danh mục' }).click();
await trang.locator('.hbar li').first().waitFor();
kiemTra((await trang.locator('.hbar li').first().innerText()).includes('60%') && await trang.locator('.hbar li').count() === 3, 'tab Danh mục: 3 thanh, Cà phê 60%');
await trang.screenshot({ path: RA + '15-bao-cao-danh-muc.png' });
await trang.getByRole('link', { name: 'Phương thức thanh toán' }).click();
await trang.locator('.hbar li').first().waitFor();
kiemTra((await trang.locator('.hbar').innerText()).includes('Chuyển khoản') && (await trang.locator('.hbar').innerText()).includes('30%'), 'tab Phương thức: có Chuyển khoản, tiền mặt 60% / chuyển khoản 30%');
await trang.getByRole('link', { name: 'Chi phí nhập và doanh thu' }).click();
await trang.locator('.bd-chu-giai').waitFor();
await trang.locator('.chi-so', { hasText: /nhiều hơn/ }).waitFor();
kiemTra(await trang.locator('.bd-chu-giai li').count() === 2 && bcReq['/bao-cao/chi-phi-vs-doanh-thu'].nhom === 'tuan', 'tab Chi phí: chú giải 2 chuỗi, giữ cách gom theo tuần');
kiemTra((await trang.locator('.chi-so').innerText()).includes('Chi nhiều hơn thu') || (await trang.locator('.chi-so').innerText()).includes('Thu nhiều hơn chi'), 'tab Chi phí: dải số liệu nói rõ thu hay chi nhiều hơn');
await trang.getByRole('button', { name: 'Bảng', exact: true }).click();
kiemTra((await trang.getByRole('table', { name: 'Chi phí nhập và doanh thu theo kỳ' }).innerText()).includes('−'), 'bảng chi phí có chênh lệch âm hiện dấu trừ');
await trang.getByRole('button', { name: 'Biểu đồ', exact: true }).click();
await trang.screenshot({ path: RA + '16-bao-cao-chi-phi.png' });
await trang.getByRole('link', { name: 'Theo nhân viên' }).click();
await trang.locator('.hbar li').first().waitFor();
kiemTra((await trang.locator('.hbar li').first().innerText()).includes('Phạm Văn Nhân Viên'), 'tab Nhân viên: người doanh thu cao nhất đứng đầu');
// không có dữ liệu
await trang.locator('#bc-tu').fill('2000-01-01'); await trang.locator('#bc-den').fill('2000-01-01');
await trang.getByRole('button', { name: 'Xem báo cáo' }).click();
await trang.getByText(/Chưa có hóa đơn đã thanh toán trong khoảng này/).waitFor();
kiemTra(true, 'khoảng không có dữ liệu: hiện thông báo rỗng, không vẽ biểu đồ trống');
// ---- Hóa đơn (quản lý) ----
await trang.getByRole('link', { name: 'Hóa đơn', exact: true }).click();
await trang.waitForURL('**/hoa-don');
await trang.getByRole('table', { name: 'Danh sách hóa đơn' }).locator('tbody tr').first().waitFor();
const bangHd = trang.getByRole('table', { name: 'Danh sách hóa đơn' });
kiemTra(hdLoc.ngay === homNayStr && hdLoc.moi_trang === '200', 'Hóa đơn: mặc định ngày hôm nay, tải tối đa 200');
kiemTra(await bangHd.locator('tbody tr').count() === 4, 'Hóa đơn: bảng 4 hóa đơn');
const chiSoHd = await trang.locator('.chi-so').innerText();
kiemTra(chiSoHd.includes('122.000đ') && chiSoHd.includes('2 hóa đơn'), 'Hóa đơn: doanh thu chỉ cộng hóa đơn đã thanh toán (87.000 + 35.000)');
kiemTra((await bangHd.innerText()).includes('Khách lẻ') && (await bangHd.innerText()).includes('Chuyển khoản') && (await bangHd.innerText()).includes('07:45'), 'Hóa đơn: khách lẻ, phương thức, giờ hiển thị');
await trang.getByRole('button', { name: 'Ngày sau' }).isDisabled().then(v => kiemTra(v, 'Hóa đơn: hôm nay thì khóa nút Ngày sau'));
await trang.getByLabel('Trạng thái').selectOption('huy');
await trang.waitForTimeout(300);
kiemTra(hdLoc.trang_thai === 'huy' && await bangHd.locator('tbody tr').count() === 1, 'Hóa đơn: lọc trạng thái Đã hủy gửi trang_thai=huy');
await trang.getByLabel('Trạng thái').selectOption('');
await trang.getByLabel('Nhân viên').selectOption('4');
await trang.waitForTimeout(300);
kiemTra(hdLoc.ma_nhan_vien === '4' && await bangHd.locator('tbody tr').count() === 1, 'Hóa đơn: lọc nhân viên gửi ma_nhan_vien=4');
await trang.getByLabel('Nhân viên').selectOption('');
await trang.getByRole('button', { name: 'Ngày trước' }).click();
await trang.waitForTimeout(300);
kiemTra(hdLoc.ngay === cong(homNayStr, -1) && await trang.getByRole('button', { name: 'Hôm nay' }).count() === 1, 'Hóa đơn: lùi một ngày gửi ngay hôm qua, hiện nút Hôm nay');
await trang.getByRole('button', { name: 'Hôm nay' }).click();
await trang.waitForTimeout(300);
kiemTra(hdLoc.ngay === homNayStr, 'Hóa đơn: nút Hôm nay quay lại hôm nay');
await bangHd.locator('tbody tr').first().click();
await trang.getByRole('complementary', { name: 'Chi tiết hóa đơn' }).getByText('Hóa đơn #1').waitFor();
const pnHd = await trang.getByRole('complementary', { name: 'Chi tiết hóa đơn' }).innerText();
kiemTra(hdMo === '/hoa-don/21' && pnHd.includes('2 × Cà phê sữa') && pnHd.includes('Giảm 10% cà phê') && pnHd.includes('ít đường') && pnHd.includes('87.000đ') && pnHd.includes('Tiền mặt'), 'Hóa đơn: panel chi tiết có món, khuyến mãi, ghi chú, tổng tiền, phương thức');
kiemTra(await trang.getByRole('button', { name: 'In hóa đơn' }).count() === 1, 'Hóa đơn: có nút In hóa đơn');
await trang.waitForTimeout(300);
await trang.screenshot({ path: RA + '18-hoa-don.png' });
await trang.setViewportSize({ width: 390, height: 900 });
await trang.waitForTimeout(400);
await trang.screenshot({ path: RA + '19-hoa-don-di-dong.png', fullPage: true });
kiemTra(await trang.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'điện thoại: trang Hóa đơn không bị cuộn ngang');
await trang.setViewportSize({ width: 1360, height: 900 });
await trang.getByRole('link', { name: 'Báo cáo', exact: true }).click();
await trang.waitForURL('**/bao-cao**');

await trang.setViewportSize({ width: 390, height: 900 });
await trang.getByRole('link', { name: 'Doanh thu', exact: true }).click();
await trang.locator('#bc-tu').fill(homNayStr.slice(0, 8) + '01'); await trang.locator('#bc-den').fill(homNayStr);
await trang.getByRole('button', { name: 'Xem báo cáo' }).click();
await trang.locator('.bd-khung svg').waitFor();
await trang.waitForTimeout(400);
await trang.screenshot({ path: RA + '17-bao-cao-di-dong.png', fullPage: true });
kiemTra(await trang.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'điện thoại: trang Báo cáo không bị cuộn ngang');
await trang.setViewportSize({ width: 1360, height: 900 });
await trang.getByRole('link', { name: 'Sản phẩm', exact: true }).click();
await trang.setViewportSize({ width: 390, height: 800 });
await trang.waitForTimeout(500); // chờ hiệu ứng trượt của menu
await trang.screenshot({ path: RA + '3-di-dong.png' });
kiemTra(loiConsole.length === 0, `không có lỗi console (${loiConsole.join(' | ')})`);
await trinhDuyet.close();
