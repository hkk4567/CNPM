// Khung dùng chung cho các kịch bản kiểm thử giao diện (smoke-web.mjs, smoke-goi-mon.mjs):
// máy chủ tĩnh phục vụ thư mục dist (kết quả `expo export --platform web`), playwright, ghi kết quả, chụp ảnh.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(process.env.PW_DIR ? path.join(process.env.PW_DIR, 'x.js') : import.meta.url);
const { chromium } = require('playwright');

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(goc, 'dist');
const anh = path.join(goc, 'scripts', 'anh-smoke');
const KIEU = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.ico': 'image/x-icon' };
export const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
export const ok = (data, them = {}) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, data, ...them }) });
export const loi = (status, ma, tb) => ({ status, contentType: 'application/json', body: JSON.stringify({ ok: false, loi: ma, thong_bao: tb }) });

export async function khoiDong({ cong, tienTo = '' }) {
  fs.mkdirSync(anh, { recursive: true });
  const maychu = http.createServer((req, res) => {
    let f = path.join(dist, decodeURIComponent(req.url.split('?')[0]));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dist, 'index.html');
    res.writeHead(200, { 'Content-Type': KIEU[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  }).listen(cong);
  const trinhDuyet = await chromium.launch();
  const ctx = await trinhDuyet.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 });
  const trang = await ctx.newPage();
  const loiTrang = [];
  trang.on('pageerror', (e) => loiTrang.push(e.message));
  let dat = 0, hong = 0;
  const kiem = (ten, ket, them = '') => { ket ? dat++ : hong++; console.log(`${ket ? 'OK  ' : 'FAIL'} ${ten}${ket ? '' : ' ' + them}`); };
  const chup = (ten) => trang.screenshot({ path: path.join(anh, `${tienTo}${ten}.png`) });
  // Giả lập /api: xuLy(p, rq, u, tra) -> trả { status, body } (hoặc undefined = 404)
  const gia = (xuLy) => trang.route('**/api/**', async (route) => {
    const rq = route.request(); const u = new URL(rq.url()); const p = u.pathname.replace(/^.*\/api/, '');
    if (rq.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const kq = (await xuLy(p, rq, u)) ?? loi(404, 'KHONG_TIM_THAY', 'Không có API này');
    return route.fulfill({ ...kq, headers: CORS });
  });
  const ketThuc = async () => {
    kiem('không có lỗi JS trong trang', loiTrang.length === 0, loiTrang.join(' | '));
    console.log(`\n${dat}/${dat + hong} đạt`);
    await trinhDuyet.close(); maychu.close();
    process.exit(hong ? 1 : 0);
  };
  return { trang, kiem, chup, gia, ketThuc, URL_APP: `http://localhost:${cong}` };
}
