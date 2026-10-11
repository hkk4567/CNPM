// Lớp gọi API dùng chung: gắn Authorization, đọc { ok, data } / { ok:false, loi, thong_bao, chi_tiet }, ném ApiError khi lỗi.
const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const KHOA_TOKEN = 'cafe_token';

export const luuToken = {
  lay() { try { return localStorage.getItem(KHOA_TOKEN); } catch { return null; } },
  dat(t) { try { localStorage.setItem(KHOA_TOKEN, t); } catch { /* bỏ qua */ } },
  xoa() { try { localStorage.removeItem(KHOA_TOKEN); } catch { /* bỏ qua */ } },
};

export class ApiError extends Error {
  constructor(status, ma, thongBao, chiTiet) {
    super(thongBao);
    this.name = 'ApiError';
    this.status = status;
    this.ma = ma;
    this.chiTiet = chiTiet;
  }
}

// AuthContext đăng ký hàm này để tự đưa người dùng về trang đăng nhập khi token hết hạn (401)
let khiHetPhien = null;
export const dangKyKhiHetPhien = fn => { khiHetPhien = fn; };

function dungUrl(duongDan, query) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query || {})) {
    if (v !== undefined && v !== null && v !== '') qs.append(k, v);
  }
  const s = qs.toString();
  return `${BASE}${duongDan}${s ? `?${s}` : ''}`;
}

async function goi(phuongThuc, duongDan, { query, body } = {}) {
  const headers = {};
  const token = luuToken.lay();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(dungUrl(duongDan, query), { method: phuongThuc, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'MAT_KET_NOI', 'Không kết nối được máy chủ. Hãy kiểm tra backend và MySQL (XAMPP) đã bật chưa.');
  }
  let json = null;
  try { json = await res.json(); } catch { /* phản hồi không phải JSON */ }

  if (!res.ok || !json || json.ok === false) {
    const loi = new ApiError(res.status, json?.loi || 'LOI_KHONG_RO', json?.thong_bao || `Lỗi ${res.status}`, json?.chi_tiet);
    // 401 khi đang có token (không tính lỗi đăng nhập sai) = phiên hết hạn
    if (res.status === 401 && token && !duongDan.startsWith('/auth/dang-nhap') && !duongDan.startsWith('/auth/doi-mat-khau')) {
      luuToken.xoa();
      if (khiHetPhien) khiHetPhien();
    }
    throw loi;
  }
  return json;
}

export const http = {
  get: async (p, query) => (await goi('GET', p, { query })).data,
  // Danh sách có phân trang: trả cả { data, tong_so_ban_ghi, trang, moi_trang }
  danhSach: (p, query) => goi('GET', p, { query }),
  post: async (p, body) => (await goi('POST', p, { body })).data,
  put: async (p, body) => (await goi('PUT', p, { body })).data,
  patch: async (p, body) => (await goi('PATCH', p, { body })).data,
  xoa: async p => (await goi('DELETE', p)).data,
};
