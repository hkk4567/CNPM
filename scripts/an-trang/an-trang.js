// scripts/an-trang/an-trang.js – ẩn/hiện trang và tab của web admin (chạy khi cần bảo trì). Chỉ ghi file backend/config/trang-an.json,
// KHÔNG cần MySQL/XAMPP và không cần khởi động lại backend: web tự cập nhật sau tối đa vài chục giây.
//
//   node scripts/an-trang/an-trang.js ds                                   # liệt kê mã trang/tab và trạng thái
//   node scripts/an-trang/an-trang.js an nhan-vien                         # ẩn 1 trang
//   node scripts/an-trang/an-trang.js an nhan-vien khuyen-mai kho/ton-kho  # ẩn nhiều trang/tab cùng lúc
//   node scripts/an-trang/an-trang.js an nhan-vien --ly-do "Đang bảo trì"  # kèm lý do hiện cho người dùng
//   node scripts/an-trang/an-trang.js hien nhan-vien                       # hiện lại
//   node scripts/an-trang/an-trang.js hien-het                             # hiện lại tất cả
// Ẩn mã trang (vd. "kho") = ẩn mọi tab của trang đó; ẩn "kho/lich-su-nhap" = chỉ ẩn tab đó.
const path = require('path');
const service = require(path.join(__dirname, '..', '..', 'backend', 'src', 'modules', 'he-thong', 'he-thong.service'));
const repo = require(path.join(__dirname, '..', '..', 'backend', 'src', 'modules', 'he-thong', 'he-thong.repository'));
const { DANH_SACH } = require(path.join(__dirname, '..', '..', 'backend', 'src', 'config', 'trang'));

const TRO_GIUP = `Dùng:
  node scripts/an-trang/an-trang.js ds
  node scripts/an-trang/an-trang.js an <ma> [<ma> ...] [--ly-do "Lý do hiện cho người dùng"]
  node scripts/an-trang/an-trang.js hien <ma> [<ma> ...]
  node scripts/an-trang/an-trang.js hien-het
Mã trang/tab: xem lệnh "ds". Ví dụ: nhan-vien, kho, kho/lich-su-nhap, bao-cao/chi-phi`;

// Tách "--ly-do" (hoặc --ly-do=...) khỏi danh sách mã
function docThamSo(argv) {
  const ma = []; let lyDo;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--ly-do') { lyDo = argv[++i]; if (lyDo === undefined) throw new Error('--ly-do cần một giá trị'); }
    else if (a.startsWith('--ly-do=')) lyDo = a.slice('--ly-do='.length);
    else if (a.startsWith('--')) throw new Error(`Không hiểu tùy chọn ${a}`);
    else ma.push(a);
  }
  return { ma, lyDo };
}

function liet_ke() {
  const trangAn = service.layTrangAn();
  const rong = Math.max(...DANH_SACH.map(t => t.ma.length));
  for (const t of DANH_SACH) {
    const truc = trangAn[t.ma];
    const cha = !truc && t.cha && trangAn[t.cha];
    const tt = truc ? `ĐANG ẨN – ${truc.ly_do}` : cha ? `ẩn theo trang "${t.cha}"` : 'hiện';
    console.log(`${t.ma.padEnd(rong)}  ${t.nhan.padEnd(38)}  ${tt}`);
  }
  console.log(`\nĐang ẩn: ${Object.keys(trangAn).length} mục. File: ${repo.duongDan()}`);
}

function chay([lenh, ...conLai]) {
  switch (lenh) {
    case 'ds': return liet_ke();
    case 'an': {
      const { ma, lyDo } = docThamSo(conLai);
      const kq = service.an(ma, lyDo);
      console.log(`Đã ẩn: ${kq.da_an.join(', ')}\nLý do hiển thị: ${kq.ly_do}`);
      return;
    }
    case 'hien': {
      const { ma, lyDo } = docThamSo(conLai);
      if (lyDo !== undefined) throw new Error('Lệnh "hien" không dùng --ly-do');
      const kq = service.hien(ma);
      if (kq.da_hien.length) console.log(`Đã hiện lại: ${kq.da_hien.join(', ')}`);
      if (kq.khong_an.length) console.log(`Vốn không bị ẩn riêng: ${kq.khong_an.join(', ')}`);
      if (kq.van_bi_che.length) console.log(`Lưu ý: ${kq.van_bi_che.join(', ')} vẫn không dùng được vì trang cha đang ẩn (chạy: hien <ma trang cha>).`);
      return;
    }
    case 'hien-het': {
      const kq = service.hienHet();
      console.log(`Đã hiện lại tất cả (${kq.da_hien} mục).`);
      return;
    }
    default:
      console.log(TRO_GIUP);
      if (lenh && lenh !== '-h' && lenh !== '--help') process.exitCode = 1;
  }
}

try { chay(process.argv.slice(2)); } catch (e) {
  console.error(`Lỗi: ${e.message}`);
  const ds = e.chiTiet?.ma_hop_le;
  if (ds) console.error(`Mã hợp lệ: ${ds.join(', ')}`);
  process.exitCode = 1;
}
