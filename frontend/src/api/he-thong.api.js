// Gọi API module he-thong (HT-01).
import { http } from './http.js';

export const trangAn = () => http.get('/he-thong/trang-an'); // HT-01: { trang_an: { "<ma>": { ly_do, luc } } }
