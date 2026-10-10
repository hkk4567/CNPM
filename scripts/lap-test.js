#!/usr/bin/env node
// Chạy lặp bộ test (hoặc vài file test) N lần, GOM LỖI vào một mảng, xong vòng lặp thì kiểm tra mảng.
// Cách dùng (từ thư mục backend/):
//   node ../scripts/lap-test.js                       # 1000 lần, toàn bộ bộ test
//   node ../scripts/lap-test.js --lan 1000 tests/khach-hang.test.js tests/khuyen-mai-ap-dung.test.js
//   node ../scripts/lap-test.js --lan 200 --ddl tests/khach-hang.test.js ...   # thêm tiến trình tháo/dựng trigger liên tục (tăng khả năng lộ deadlock)
//   node ../scripts/lap-test.js --lan 50 --tai 4      # thêm 4 tiến trình đốt CPU để tăng tranh chấp (gần máy chậm hơn)
// Mã thoát: 0 nếu mảng lỗi rỗng, 1 nếu có lỗi. Chi tiết ghi ra logs/lap-test-<thời gian>.json
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
let lan = 1000; let tai = 0; let ddl = false; const files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--lan') lan = Number(args[++i]);
  else if (args[i] === '--tai') tai = Number(args[++i]);
  else if (args[i] === '--ddl') ddl = true;
  else files.push(args[i]);
}

// Tiến trình đốt CPU (tùy chọn)
const dotCpu = [];
for (let i = 0; i < tai; i++) dotCpu.push(spawn(process.execPath, ['-e', 'for(;;){}'], { stdio: 'ignore' }));

if (ddl) dotCpu.push(spawn(process.execPath, [path.join(__dirname, 'gay-nhieu-ddl.js')], { stdio: 'ignore' })); // tiến trình gây nhiễu DDL

const loiGom = []; // mỗi phần tử: { lan, loai, ten_test, thong_diep }
const CHU_KY = /deadlock|ER_LOCK_DEADLOCK|ER_LOCK_WAIT_TIMEOUT|Lock wait timeout|errno: 1213|errno: 1205|LOI_HE_THONG/i;

function chayMotLan(stt) {
  return new Promise(resolve => {
    const cmd = ['--test', '--test-reporter=spec', ...files];
    const p = spawn(process.execPath, cmd, { env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' } });
    let out = '';
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { out += d; });
    p.on('close', code => {
      const dong = out.split(/\r?\n/);
      const thatBai = new Set();
      dong.forEach((d, i) => {
        const m = d.match(/^\s*✖ (.+?) \(\d+(\.\d+)?ms\)\s*$/);
        if (!m || /^failing tests:?$/.test(m[1])) return;
        if (thatBai.has(m[1])) return;
        thatBai.add(m[1]);
        loiGom.push({ lan: stt, loai: 'test_that_bai', ten_test: m[1], thong_diep: dong.slice(i + 1, i + 6).map(x => x.trim()).filter(Boolean).join(' | ').slice(0, 400) });
      });
      // Lỗi hệ thống/deadlock được in ra stderr (console.error) dù test có thể vẫn qua
      dong.forEach((d, i) => {
        // bỏ qua dòng là TÊN test (✔ ▶ ✖ ℹ ... '(không deadlock)') và dòng assert; chỉ lấy log lỗi thật của máy chủ
        if (CHU_KY.test(d) && !/^\s*[✔✖▶ℹ﹣]/.test(d) && !/^\s*(not )?ok \d|# Subtest|AssertionError|failing tests|^\s*\d+ !== \d+/.test(d)) {
          loiGom.push({ lan: stt, loai: 'log_loi', ten_test: '(stderr)', thong_diep: dong.slice(Math.max(0, i - 1), i + 3).map(x => x.trim()).join(' | ').slice(0, 400) });
        }
      });
      if (code !== 0 && !thatBai.size) loiGom.push({ lan: stt, loai: 'thoat_khac_0', ten_test: '(không rõ)', thong_diep: dong.slice(-15).join(' | ').slice(0, 400) });
      resolve();
    });
  });
}

(async () => {
  const t0 = Date.now();
  for (let i = 1; i <= lan; i++) {
    await chayMotLan(i);
    if (i % 5 === 0 || i === lan) console.log(`[${i}/${lan}] lỗi tích lũy: ${loiGom.length} (${Math.round((Date.now() - t0) / 1000)}s)`);
  }
  dotCpu.forEach(c => c.kill('SIGTERM'));

  // ---- Kiểm tra mảng lỗi sau khi lặp xong ----
  console.log(`\n===== KẾT QUẢ: ${lan} lần chạy, ${loiGom.length} lỗi =====`);
  const nhom = {};
  for (const l of loiGom) {
    const k = `${l.loai} :: ${l.ten_test} :: ${l.thong_diep.replace(/\d{6,}/g, 'N').slice(0, 120)}`;
    (nhom[k] = nhom[k] || []).push(l.lan);
  }
  for (const [k, ds] of Object.entries(nhom)) console.log(`- ${ds.length} lần: ${k}\n    ở các lần: ${ds.slice(0, 15).join(', ')}${ds.length > 15 ? ', ...' : ''}`);
  fs.mkdirSync(path.join(__dirname, '..', 'logs'), { recursive: true });
  const f = path.join(__dirname, '..', 'logs', `lap-test-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(f, JSON.stringify({ lan, tai, files, tong_loi: loiGom.length, loi: loiGom }, null, 1));
  console.log(`Chi tiết: ${f}`);
  process.exit(loiGom.length === 0 ? 0 : 1);
})();
