// Lưu khóa-giá trị: SecureStore trên điện thoại (token được mã hóa bởi hệ điều hành), localStorage trên bản web (chỉ dùng để thử).
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export async function doc(khoa: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return localStorage.getItem(khoa);
    return await SecureStore.getItemAsync(khoa);
  } catch { return null; }
}
export async function ghi(khoa: string, giaTri: string): Promise<void> {
  try {
    if (Platform.OS === 'web') localStorage.setItem(khoa, giaTri);
    else await SecureStore.setItemAsync(khoa, giaTri);
  } catch { /* bỏ qua: không lưu được thì lần sau đăng nhập lại */ }
}
export async function xoa(khoa: string): Promise<void> {
  try {
    if (Platform.OS === 'web') localStorage.removeItem(khoa);
    else await SecureStore.deleteItemAsync(khoa);
  } catch { /* bỏ qua */ }
}
