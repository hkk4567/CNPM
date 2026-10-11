// bao-cao – schema query (BC-01..BC-06). Mọi báo cáo lọc theo khoảng ngày (tu_ngay/den_ngay, gồm cả hai đầu, đều tùy chọn).
const { z } = require('zod');
const { truongKhoangNgay, khoangHopLe, thongBaoKhoang } = require('../../utils/loc-ngay');

const so = ten => ({ error: `${ten} phải là số` });
const nhomEnum = z.enum(['ngay', 'tuan', 'thang'], { error: 'nhom phải là ngay, tuan hoặc thang' });
const top = z.coerce.number(so('top')).int(so('top')).min(1, 'top tối thiểu là 1').max(100, 'top tối đa 100');

const khoangNgay = z.object(truongKhoangNgay).refine(khoangHopLe, thongBaoKhoang);
const theoNhom = z.object({ ...truongKhoangNgay, nhom: nhomEnum.optional() }).refine(khoangHopLe, thongBaoKhoang); // BC-01, BC-05
const theoTop = z.object({ ...truongKhoangNgay, top: top.optional() }).refine(khoangHopLe, thongBaoKhoang);        // BC-02

module.exports = { khoangNgay, theoNhom, theoTop };
