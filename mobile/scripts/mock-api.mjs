// API giả có trạng thái dùng chung cho các kịch bản kiểm thử giao diện (mô phỏng các luật chính của backend).
import { ok, loi } from './lib-smoke.mjs';

export const NV = { ma_tai_khoan: 5, ma_nhan_vien: 7, ho_ten: 'Nguyễn Văn An', quyen_truy_cap: 'nhan_vien' };
const KM = [{ ma_khuyen_mai: 1, ten_khuyen_mai: 'Giảm 3k cà phê', muc_giam_moi_ly: 3000 }];
const MENU = [
  { ma_san_pham: 1, ma_danh_muc: 1, ten_danh_muc: 'Cà phê', ten_san_pham: 'Cà phê sữa', gia_ban: 29000, gia_sau_giam: 26000, tong_giam_moi_ly: 3000, so_ly_toi_da: null, du_nguyen_lieu: true, khuyen_mai: KM },
  { ma_san_pham: 2, ma_danh_muc: 2, ten_danh_muc: 'Trà', ten_san_pham: 'Trà đào', gia_ban: 35000, gia_sau_giam: 35000, tong_giam_moi_ly: 0, so_ly_toi_da: 2, du_nguyen_lieu: true, khuyen_mai: [] },
  { ma_san_pham: 3, ma_danh_muc: 1, ten_danh_muc: 'Cà phê', ten_san_pham: 'Bạc xỉu', gia_ban: 32000, gia_sau_giam: 32000, tong_giam_moi_ly: 0, so_ly_toi_da: null, du_nguyen_lieu: true, khuyen_mai: [] },
  { ma_san_pham: 4, ma_danh_muc: 3, ten_danh_muc: 'Đồ ăn', ten_san_pham: 'Bánh mì', gia_ban: 25000, gia_sau_giam: 25000, tong_giam_moi_ly: 0, so_ly_toi_da: 0, du_nguyen_lieu: false, khuyen_mai: [] },
];
export const khachHang = [
  { ma_khach_hang: 3, ten_khach_hang: 'Nguyễn Thị Hoa', so_dien_thoai: '0912345678', diem_tich_luy: 40 },
  { ma_khach_hang: 4, ten_khach_hang: 'Nguyễn Văn Bình', so_dien_thoai: '0987654321', diem_tich_luy: 12 },
  { ma_khach_hang: 5, ten_khach_hang: 'Trần Thị Hoa', so_dien_thoai: '0933333333', diem_tich_luy: 0 },
];
const khongDau = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
const sp = (ma) => MENU.find((m) => m.ma_san_pham === ma);

// ---- Máy chủ giả có trạng thái ----
export const orders = []; let dem = 0; let demDong = 100;
export const goi = []; // nhật ký các lời gọi ghi
const tinh = (o) => {
  const th = o.chi_tiet.reduce((s, c) => s + c.so_luong * c.don_gia, 0); const gg = o.chi_tiet.reduce((s, c) => s + c.giam_gia, 0);
  return { ...o, ma_nhan_vien: 7, ten_nhan_vien: NV.ho_ten, phuong_thuc_thanh_toan: o.phuong_thuc_thanh_toan ?? null, tong_tien_hang: th, tong_giam_gia: gg, tong_tien_tam_tinh: th - gg, tong_tien: o.trang_thai === 'da_thanh_toan' ? o.tong_chot : null };
};
const dong = (m, sl, gc) => { const s = sp(m); const gg = sl * s.tong_giam_moi_ly; return { ma_chi_tiet: ++demDong, ma_san_pham: m, ten_san_pham: s.ten_san_pham, so_luong: sl, don_gia: s.gia_ban, giam_gia: gg, ghi_chu: gc ?? null, thanh_tien: sl * s.gia_ban - gg, khuyen_mai: s.khuyen_mai }; };
const dongLai = (c, sl) => { const gg = sl * (c.giam_gia / c.so_luong); c.so_luong = sl; c.giam_gia = gg; c.thanh_tien = sl * c.don_gia - gg; };
const tom = (o) => { const t = tinh(o); return { ma_hoa_don: o.ma_hoa_don, so_thu_tu: o.so_thu_tu, thoi_gian_tao: o.thoi_gian_tao, trang_thai: o.trang_thai, phuong_thuc_thanh_toan: o.phuong_thuc_thanh_toan ?? null, ma_khach_hang: o.ma_khach_hang, ten_khach_hang: o.ten_khach_hang, ma_nhan_vien: 7, ten_nhan_vien: NV.ho_ten, so_mon: o.chi_tiet.reduce((s, c) => s + c.so_luong, 0), tong_tien: t.tong_tien_tam_tinh }; };
const CB = [{ ma_nguyen_lieu: 9, ten_nguyen_lieu: 'Đào ngâm', don_vi_tinh: 'g', so_luong_ton: 0, muc_ton_toi_thieu: 200 }];

export const caiGia = (gia) => gia(async (p, rq, u) => {
  const body = rq.postData() ? JSON.parse(rq.postData()) : undefined; const m = rq.method();
  if (p === '/auth/dang-nhap') return body.mat_khau === 'matkhau1' ? ok({ token: 'tok-an', nguoi_dung: NV }) : loi(401, 'SAI_THONG_TIN', 'Sai thông tin');
  if (rq.headers()['authorization'] !== 'Bearer tok-an') return loi(401, 'CHUA_DANG_NHAP', 'Chưa đăng nhập');
  if (p === '/auth/toi') return ok(NV);
  if (p === '/san-pham/menu') return ok(MENU);
  if (p === '/nhan-su/lich-tuan') return ok([], { tu_ngay: u.searchParams.get('tu_ngay'), den_ngay: u.searchParams.get('tu_ngay') });
  if (p === '/khach-hang' && m === 'GET') {
    const k = khongDau(u.searchParams.get('tu_khoa') || '');
    return ok(khachHang.filter((x) => khongDau(x.ten_khach_hang).includes(k) || x.so_dien_thoai.includes(k)));
  }
  if (p === '/khach-hang' && m === 'POST') {
    goi.push({ m, p, body });
    if (khachHang.some((x) => x.so_dien_thoai === body.so_dien_thoai)) return loi(409, 'TRUNG_SDT', 'Số điện thoại đã tồn tại');
    const moi = { ma_khach_hang: 10 + khachHang.length, ten_khach_hang: body.ten_khach_hang, so_dien_thoai: body.so_dien_thoai, diem_tich_luy: 0 };
    khachHang.push(moi); return { ...ok(moi), status: 201 };
  }
  if (p === '/hoa-don' && m === 'GET') {
    const tt = u.searchParams.get('trang_thai'); const ds = orders.filter((o) => !tt || o.trang_thai === tt).map(tom);
    return ok(ds, { tong_so_ban_ghi: ds.length, trang: 1, moi_trang: 200 });
  }
  if (p === '/hoa-don' && m === 'POST') {
    goi.push({ m, p, body });
    if (body.items.some((i) => i.ma_san_pham === 1 && i.so_luong >= 5)) return loi(409, 'KHONG_DU_NGUYEN_LIEU', 'Không đủ nguyên liệu: Sữa đặc cần 500 g, còn 100 g (thiếu 400 g)');
    const o = { ma_hoa_don: ++dem, so_thu_tu: dem, thoi_gian_tao: new Date().toISOString(), trang_thai: 'dang_pha_che', ma_khach_hang: null, ten_khach_hang: null, chi_tiet: body.items.map((i) => dong(i.ma_san_pham, i.so_luong, i.ghi_chu)) };
    orders.push(o);
    return { ...ok({ ...tinh(o), ...(body.items.some((i) => i.ma_san_pham === 2) ? { canh_bao_kho: CB } : { canh_bao_kho: [] }) }), status: 201 };
  }
  const k = p.match(/^\/hoa-don\/(\d+)(?:\/(dong|trang-thai|huy|khach-hang|thanh-toan)(?:\/(\d+))?)?$/);
  if (k) {
    const o = orders.find((x) => x.ma_hoa_don === Number(k[1])); if (!o) return loi(404, 'KHONG_TIM_THAY', 'Không tìm thấy hóa đơn');
    const mo = () => o.trang_thai === 'dang_pha_che' || o.trang_thai === 'da_phuc_vu';
    if (!k[2] && m === 'GET') return ok(tinh(o));
    goi.push({ m, p, body, query: u.search });
    if (!mo()) return loi(409, 'HOA_DON_DA_DONG', 'Hóa đơn đã đóng, không thay đổi được');
    if (k[2] === 'dong' && m === 'POST') { o.chi_tiet.push(dong(body.ma_san_pham, body.so_luong, body.ghi_chu)); return { ...ok({ ...tinh(o), canh_bao_kho: [] }), status: 201 }; }
    if (k[2] === 'dong' && m === 'PATCH') { const c = o.chi_tiet.find((x) => x.ma_chi_tiet === Number(k[3])); if (body.so_luong) dongLai(c, body.so_luong); if ('ghi_chu' in body) c.ghi_chu = body.ghi_chu; return ok(tinh(o)); }
    if (k[2] === 'dong' && m === 'DELETE') { o.chi_tiet = o.chi_tiet.filter((x) => x.ma_chi_tiet !== Number(k[3])); return ok(tinh(o)); }
    if (k[2] === 'trang-thai') { o.trang_thai = body.trang_thai_moi; return ok(tinh(o)); }
    if (k[2] === 'thanh-toan') {
      const t = tinh(o).tong_tien_tam_tinh; const diem = o.ma_khach_hang ? Math.floor(t / 10000) : 0;
      o.trang_thai = 'da_thanh_toan'; o.phuong_thuc_thanh_toan = body.phuong_thuc_thanh_toan; o.tong_chot = t;
      return ok({ hoa_don: tinh(o), diem_cong: diem, diem_hien_tai: o.ma_khach_hang ? khachHang.find((x) => x.ma_khach_hang === o.ma_khach_hang).diem_tich_luy + diem : null });
    }
    if (k[2] === 'huy') { o.trang_thai = 'huy'; return ok(tinh(o)); }
    if (k[2] === 'khach-hang') {
      const kh = khachHang.find((x) => x.so_dien_thoai === body.so_dien_thoai);
      if (!kh) return loi(404, 'KHONG_TIM_THAY', 'Chưa có khách hàng với số điện thoại này; hãy tạo khách mới');
      o.ma_khach_hang = kh.ma_khach_hang; o.ten_khach_hang = kh.ten_khach_hang; return ok(kh);
    }
    if (k[2] === 'thanh-toan') {
      const t = tinh(o).tong_tien_tam_tinh; const diem = o.ma_khach_hang ? Math.floor(t / 10000) : 0;
      o.trang_thai = 'da_thanh_toan'; o.phuong_thuc_thanh_toan = body.phuong_thuc_thanh_toan; o.tong_chot = t;
      return ok({ hoa_don: tinh(o), diem_cong: diem, diem_hien_tai: o.ma_khach_hang ? khachHang.find((x) => x.ma_khach_hang === o.ma_khach_hang).diem_tich_luy + diem : null });
    }
    if (k[2] === 'huy') { o.trang_thai = 'huy'; return ok(tinh(o)); }
    if (k[2] === 'khach-hang') {
      if (body.so_dien_thoai !== '0912345678') return loi(404, 'KHONG_TIM_THAY', 'Chưa có khách hàng với số điện thoại này; hãy tạo khách mới');
      o.ma_khach_hang = 3; o.ten_khach_hang = 'Nguyễn Thị Hoa'; return ok({ ma_khach_hang: 3, ten_khach_hang: 'Nguyễn Thị Hoa', diem_tich_luy: 40 });
    }
  }
  return undefined;
});
