// he-thong – repository (HT-01 trang không khả dụng): đọc/ghi file backend/config/trang-an.json.
// Định dạng: { "<ma trang hoặc ma trang/tab>": { "ly_do": "...", "luc": "<ISO>" } }. Đổi đường dẫn bằng biến TRANG_AN_FILE (dùng cho test).
const fs = require('fs');
const path = require('path');

const duongDan = () => process.env.TRANG_AN_FILE || path.join(__dirname, '..', '..', '..', 'config', 'trang-an.json');

// Trả về object; file chưa có = {}. Ném lỗi nếu file hỏng (nội dung không phải object JSON).
function doc() {
  let chuoi;
  try { chuoi = fs.readFileSync(duongDan(), 'utf8'); } catch (e) { if (e.code === 'ENOENT') return {}; throw e; }
  if (!chuoi.trim()) return {};
  const v = JSON.parse(chuoi);
  if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new Error('trang-an.json phải là một object JSON');
  return v;
}

// Ghi ra file tạm rồi đổi tên, để không bao giờ để lại file ghi dở khi đang có request đọc.
function ghi(duLieu) {
  const dich = duongDan();
  fs.mkdirSync(path.dirname(dich), { recursive: true });
  const tam = `${dich}.${process.pid}.tmp`;
  fs.writeFileSync(tam, `${JSON.stringify(duLieu, null, 2)}\n`);
  fs.renameSync(tam, dich);
}

module.exports = { doc, ghi, duongDan };
