// Địa chỉ backend. Mặc định lấy từ EXPO_PUBLIC_API_URL; người dùng có thể đổi trong app (màn Đăng nhập) và được nhớ lại.
import { Platform } from 'react-native';
import { doc, ghi } from '../storage';

const MAC_DINH = process.env.EXPO_PUBLIC_API_URL
  || (Platform.OS === 'android' ? 'http://10.0.2.2:3000/api' : 'http://localhost:3000/api');
let url = MAC_DINH;

// "192.168.1.10:3000" -> "http://192.168.1.10:3000/api"
export function chuanHoaUrl(v: string): string {
  let s = v.trim().replace(/\/+$/, '');
  if (!s) return MAC_DINH;
  if (!/^https?:\/\//i.test(s)) s = `http://${s}`;
  if (!/\/api$/i.test(s)) s = `${s}/api`;
  return s;
}
export const layUrl = () => url;
export async function napUrl() { const v = await doc('api_url'); if (v) url = v; }
export async function datUrl(v: string) { url = chuanHoaUrl(v); await ghi('api_url', url); return url; }
