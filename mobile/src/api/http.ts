// Lớp gọi API dùng chung: gắn Authorization, đọc { ok, data } / { ok:false, loi, thong_bao, chi_tiet }, ném ApiError khi lỗi.
import { layUrl } from './cau-hinh';

export class ApiError extends Error {
  status: number; ma: string; chiTiet?: { truong?: string; thong_bao?: string }[];
  constructor(status: number, ma: string, thongBao: string, chiTiet?: ApiError['chiTiet']) {
    super(thongBao); this.name = 'ApiError'; this.status = status; this.ma = ma; this.chiTiet = chiTiet;
  }
}

let token: string | null = null;
export const datToken = (t: string | null) => { token = t; };
let khiHetPhien: (() => void) | null = null;
export const dangKyKhiHetPhien = (fn: () => void) => { khiHetPhien = fn; };

const HET_GIO_MS = 15000;
type Query = Record<string, string | number | undefined | null>;

function dungUrl(duongDan: string, query?: Query) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null && v !== '') qs.append(k, String(v));
  const s = qs.toString();
  return `${layUrl()}${duongDan}${s ? `?${s}` : ''}`;
}

async function goi(phuongThuc: string, duongDan: string, tuyChon: { query?: Query; body?: unknown } = {}) {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (tuyChon.body !== undefined) headers['Content-Type'] = 'application/json';

  const dieuKhien = new AbortController();
  const dongHo = setTimeout(() => dieuKhien.abort(), HET_GIO_MS);
  let res: Response;
  try {
    res = await fetch(dungUrl(duongDan, tuyChon.query), {
      method: phuongThuc, headers, signal: dieuKhien.signal,
      body: tuyChon.body === undefined ? undefined : JSON.stringify(tuyChon.body),
    });
  } catch {
    throw new ApiError(0, 'MAT_KET_NOI', `Không kết nối được máy chủ (${layUrl()}). Kiểm tra backend đã chạy, điện thoại và máy tính cùng Wi-Fi, và địa chỉ máy chủ.`);
  } finally { clearTimeout(dongHo); }

  let json: any = null;
  try { json = await res.json(); } catch { /* không phải JSON */ }
  if (!res.ok || !json || json.ok === false) {
    const loi = new ApiError(res.status, json?.loi || 'LOI_KHONG_RO', json?.thong_bao || `Lỗi ${res.status}`, json?.chi_tiet);
    // 401 khi đang có token (không tính đăng nhập / đổi mật khẩu sai) = phiên hết hạn
    if (res.status === 401 && token && !duongDan.startsWith('/auth/dang-nhap') && !duongDan.startsWith('/auth/doi-mat-khau')) {
      token = null; khiHetPhien?.();
    }
    throw loi;
  }
  return json;
}

export const http = {
  get: async <T>(p: string, query?: Query): Promise<T> => (await goi('GET', p, { query })).data,
  // Trả cả phần ngoài data (tong_so_ban_ghi, tu_ngay, ...)
  danhSach: <T>(p: string, query?: Query): Promise<T> => goi('GET', p, { query }),
  post: async <T>(p: string, body?: unknown): Promise<T> => (await goi('POST', p, { body })).data,
  patch: async <T>(p: string, body?: unknown): Promise<T> => (await goi('PATCH', p, { body })).data,
  xoa: async <T>(p: string): Promise<T> => (await goi('DELETE', p)).data,
};

export const thongBaoLoi = (e: unknown) => (e instanceof Error && e.message) || 'Có lỗi xảy ra, vui lòng thử lại';
