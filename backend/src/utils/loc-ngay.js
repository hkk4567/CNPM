// Bộ lọc ngày dùng chung cho các báo cáo: tu_ngay/den_ngay dạng YYYY-MM-DD (gồm cả hai đầu), tu_ngay <= den_ngay.
const { z } = require('zod');

const ngay = ten => z.string({ error: `${ten} phải có dạng YYYY-MM-DD` }).regex(/^\d{4}-\d{2}-\d{2}$/, `${ten} phải có dạng YYYY-MM-DD`)
  .refine(s => { const d = new Date(`${s}T00:00:00Z`); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; }, `${ten} không hợp lệ`);

const truongKhoangNgay = { tu_ngay: ngay('tu_ngay').optional(), den_ngay: ngay('den_ngay').optional() };
const khoangHopLe = q => !q.tu_ngay || !q.den_ngay || q.tu_ngay <= q.den_ngay;
const thongBaoKhoang = { error: 'tu_ngay không được sau den_ngay' };

// Điều kiện SQL cho một cột thời gian: [dk[], tham[]] — đầu dưới gồm, đầu trên gồm trọn ngày den_ngay.
function dieuKienNgay(cot, { tu_ngay, den_ngay }) {
  const dk = []; const tham = [];
  if (tu_ngay) { dk.push(`${cot} >= ?`); tham.push(tu_ngay); }
  if (den_ngay) { dk.push(`${cot} < ? + INTERVAL 1 DAY`); tham.push(den_ngay); }
  return { dk, tham };
}

module.exports = { ngay, truongKhoangNgay, khoangHopLe, thongBaoKhoang, dieuKienNgay };
