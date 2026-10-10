// Giả lập file test khác đang DỌN snapshot: liên tục tháo/dựng trigger của HoaDonDaThanhToan (DDL) theo đúng cách tests/_tien-ich-snapshot.js
// làm, để lộ lỗi deadlock / "table definition has changed" xảy ra khi chạy test nhiều lần. Chạy từ backend/: node ../scripts/gay-nhieu-ddl.js
// (lap-test.js --ddl tự bật/tắt tiến trình này.)
const path = require('node:path');
const pool = require(path.join(__dirname, '..', 'backend', 'src', 'config', 'db'));
const { xoaSnapshot } = require(path.join(__dirname, '..', 'backend', 'tests', '_tien-ich-snapshot.js'));
(async () => {
  for (;;) {
    try { await xoaSnapshot(pool, [-1]); } catch (e) { console.error('ddl', e.message); }
    await new Promise(r => setTimeout(r, 30));
  }
})();
