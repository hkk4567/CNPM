// kho – nghiệp vụ. (1) Bán hàng: kiểm tra đủ nguyên liệu, TRỪ NGAY khi gọi món, TRẢ LẠI khi bỏ ly chưa làm (xem hoa-don.service).
// (2) Quản trị kho, bước 8a: KHO-01 nguyên liệu, KHO-02 nhà cung cấp, KHO-06 tồn kho/cảnh báo. 8b: KHO-03 công thức, KHO-04/05 nhập hàng.
const repo = require('./kho.repository');
const { loi } = require('../../utils/loi-nghiep-vu');
const { withTransaction } = require('../../utils/transaction');
const sanPhamService = require('../san-pham/san-pham.service');

const lamTron = n => Math.round(n * 1000) / 1000;

// Hàm thuần (dễ test): dongs = [{ ma_san_pham, so_luong }]; congThuc = hàng từ layCongThucVaTon.
// Gộp nhu cầu theo nguyên liệu trên TẤT CẢ dòng. Trả [{ ma_nguyen_lieu, ten_nguyen_lieu, don_vi_tinh, so_luong_ton, can_dung }].
function tinhNhuCau(dongs, congThuc) {
  const theoSanPham = new Map();
  for (const c of congThuc) {
    if (!theoSanPham.has(c.ma_san_pham)) theoSanPham.set(c.ma_san_pham, []);
    theoSanPham.get(c.ma_san_pham).push(c);
  }
  const tong = new Map();
  for (const d of dongs) {
    for (const c of theoSanPham.get(d.ma_san_pham) || []) { // sản phẩm chưa có công thức: không giới hạn
      const muc = tong.get(c.ma_nguyen_lieu) || {
        ma_nguyen_lieu: c.ma_nguyen_lieu, ten_nguyen_lieu: c.ten_nguyen_lieu, don_vi_tinh: c.don_vi_tinh,
        so_luong_ton: c.so_luong_ton, can_dung: 0,
      };
      muc.can_dung += d.so_luong * c.dinh_luong;
      tong.set(c.ma_nguyen_lieu, muc);
    }
  }
  return [...tong.values()].map(m => ({ ...m, can_dung: lamTron(m.can_dung), so_luong_ton: lamTron(m.so_luong_ton) }));
}

// Nguyên liệu còn thiếu (rỗng = đủ)
function tinhThieu(dongs, congThuc) {
  return tinhNhuCau(dongs, congThuc)
    .filter(m => m.can_dung > m.so_luong_ton)
    .map(m => ({ ...m, con_thieu: lamTron(m.can_dung - m.so_luong_ton) }));
}

// TRỪ KHO khi gọi món (tạo order, thêm món, tăng số lượng): chỉ trừ phần ly MỚI thêm. Phải gọi trong transaction của hóa đơn.
// Khóa các nguyên liệu liên quan TRƯỚC (FOR UPDATE, theo thứ tự mã), đọc lại tồn mới nhất, kiểm tra đủ rồi mới trừ:
// hai order đồng thời dùng chung nguyên liệu sẽ chạy nối tiếp, người đến sau thấy tồn đã giảm. Thiếu: 409 KHONG_DU_NGUYEN_LIEU, không trừ gì.
// Trả { canh_bao_kho } = các nguyên liệu vừa trừ mà tồn còn <= mức tối thiểu.
async function truKho(dongs, conn) {
  const dsMaSanPham = [...new Set(dongs.map(d => d.ma_san_pham))];
  const congThucTho = await repo.layCongThucVaTon(dsMaSanPham, conn);
  const dsMaNguyenLieu = [...new Set(congThucTho.map(c => c.ma_nguyen_lieu))].sort((a, b) => a - b);
  if (!dsMaNguyenLieu.length) return { canh_bao_kho: [] };

  const daKhoa = new Map((await repo.khoaNguyenLieu(dsMaNguyenLieu, conn)).map(r => [r.ma_nguyen_lieu, r]));
  const congThuc = congThucTho.map(c => ({ ...c, so_luong_ton: daKhoa.get(c.ma_nguyen_lieu).so_luong_ton })); // tồn MỚI NHẤT
  const nhuCau = tinhNhuCau(dongs, congThuc);
  const thieu = nhuCau.filter(m => m.can_dung > m.so_luong_ton).map(m => ({ ...m, con_thieu: lamTron(m.can_dung - m.so_luong_ton) }));
  if (thieu.length) throw loi.khongDuNguyenLieu(thieu);

  const canhBao = [];
  try {
    for (const m of nhuCau) {
      await repo.truTon(m.ma_nguyen_lieu, m.can_dung, conn);
      const conLai = lamTron(m.so_luong_ton - m.can_dung);
      const muc = daKhoa.get(m.ma_nguyen_lieu).muc_ton_toi_thieu;
      if (conLai <= muc) {
        canhBao.push({ ma_nguyen_lieu: m.ma_nguyen_lieu, ten_nguyen_lieu: m.ten_nguyen_lieu, don_vi_tinh: m.don_vi_tinh, so_luong_ton: conLai, muc_ton_toi_thieu: muc });
      }
    }
  } catch (e) {
    // Chốt chặn cuối: CHECK so_luong_ton >= 0 (MariaDB lỗi 4025, MySQL 8 lỗi 3819)
    if (e.errno === 4025 || e.errno === 3819) throw loi.xungDot('KHONG_DU_NGUYEN_LIEU', 'Không đủ nguyên liệu (kho vừa thay đổi), vui lòng thử lại');
    throw e;
  }
  return { canh_bao_kho: canhBao };
}

// TRẢ KHO khi bỏ ly CHƯA làm (xóa dòng, giảm số lượng, hủy order). dongs = [{ ma_san_pham, so_luong }] là số ly được trả.
// Khóa nguyên liệu cùng thứ tự với truKho. Ly ĐÃ làm thì KHÔNG đưa vào đây (nguyên liệu đã dùng, giữ nguyên số đã trừ).
async function traKho(dongs, conn) {
  const dsMaSanPham = [...new Set(dongs.map(d => d.ma_san_pham))];
  const congThuc = await repo.layCongThucVaTon(dsMaSanPham, conn);
  const dsMaNguyenLieu = [...new Set(congThuc.map(c => c.ma_nguyen_lieu))].sort((a, b) => a - b);
  if (!dsMaNguyenLieu.length) return;
  await repo.khoaNguyenLieu(dsMaNguyenLieu, conn);
  for (const m of tinhNhuCau(dongs, congThuc)) await repo.congTon(m.ma_nguyen_lieu, m.can_dung, conn);
}

// ---------- KHO-01: nguyên liệu ----------
const ERR_TRUNG = 1062;      // UNIQUE ten_nguyen_lieu
const ERR_DANG_DUNG = 1451;  // khóa ngoại chặn xóa (chốt chặn cuối)
const loiTrungTen = () => loi.xungDot('TRUNG_TEN_NGUYEN_LIEU', 'Tên nguyên liệu đã tồn tại');
const loiKhongCoNl = () => loi.khongTimThay('Không tìm thấy nguyên liệu');
const loiNlDangDung = ({ cong_thuc: ct, phieu_nhap: pn }) => loi.xungDot('NGUYEN_LIEU_DANG_DUNG',
  `Nguyên liệu đang được dùng trong ${[ct && 'công thức', pn && 'phiếu nhập'].filter(Boolean).join(' và ')}, không thể xóa`, { cong_thuc: ct, phieu_nhap: pn });

async function layNguyenLieu(ma) {
  const nl = await repo.timNguyenLieu(ma);
  if (!nl) throw loiKhongCoNl();
  return nl;
}

// so_luong_ton luôn khởi tạo 0 (cột mặc định); chỉ tăng qua nhập hàng, giảm qua bán hàng
async function taoNguyenLieu(d) {
  try {
    return await repo.timNguyenLieu(await repo.taoNguyenLieu(d));
  } catch (e) {
    throw e.errno === ERR_TRUNG ? loiTrungTen() : e;
  }
}

// Khóa dòng nguyên liệu trước. Đổi đơn vị tính khi đã có tồn/công thức/phiếu nhập sẽ làm sai nghĩa mọi con số cũ -> 409.
function suaNguyenLieu(ma, d) {
  return withTransaction(async conn => {
    const cu = await repo.khoaMotNguyenLieu(ma, conn);
    if (!cu) throw loiKhongCoNl();
    if (d.don_vi_tinh !== undefined && d.don_vi_tinh !== cu.don_vi_tinh) {
      const dung = await repo.nguyenLieuDangDung(ma, conn);
      if (cu.so_luong_ton > 0 || dung.cong_thuc || dung.phieu_nhap) {
        throw loi.xungDot('KHONG_DOI_DON_VI', 'Không đổi được đơn vị tính khi nguyên liệu còn tồn kho hoặc đã nằm trong công thức/phiếu nhập', { ...dung, so_luong_ton: cu.so_luong_ton });
      }
    }
    try {
      await repo.suaNguyenLieu(ma, d, conn);
    } catch (e) {
      throw e.errno === ERR_TRUNG ? loiTrungTen() : e;
    }
    return repo.timNguyenLieu(ma, conn);
  });
}

// Xóa: chặn nếu đã có trong CongThuc/ChiTietNhap (409). Khóa dòng trước để không lọt công thức vừa được đặt (8b khóa cùng dòng).
async function xoaNguyenLieu(ma) {
  try {
    return await withTransaction(async conn => {
      if (!(await repo.khoaMotNguyenLieu(ma, conn))) throw loiKhongCoNl();
      const dung = await repo.nguyenLieuDangDung(ma, conn);
      if (dung.cong_thuc || dung.phieu_nhap) throw loiNlDangDung(dung);
      await repo.xoaNguyenLieu(ma, conn);
      return { ma_nguyen_lieu: ma, da_xoa: true };
    });
  } catch (e) {
    if (e.errno === ERR_DANG_DUNG) throw loiNlDangDung({ cong_thuc: true, phieu_nhap: false });
    throw e;
  }
}

const danhSachNguyenLieu = ({ tu_khoa }, phanTrang) => repo.danhSachNguyenLieu(tu_khoa, phanTrang);

// ---------- KHO-06: tồn kho / cảnh báo ----------
const tonKho = ({ chi_sap_het, tu_khoa }) => repo.tonKho({ chiSapHet: !!chi_sap_het, tuKhoa: tu_khoa });

// ---------- KHO-02: nhà cung cấp ----------
const loiKhongCoNcc = () => loi.khongTimThay('Không tìm thấy nhà cung cấp');

async function layNcc(ma) {
  const n = await repo.timNcc(ma);
  if (!n) throw loiKhongCoNcc();
  return n;
}

async function taoNcc(d) {
  return repo.timNcc(await repo.taoNcc(d));
}

function suaNcc(ma, d) {
  return withTransaction(async conn => {
    if (!(await repo.khoaNcc(ma, conn))) throw loiKhongCoNcc();
    await repo.suaNcc(ma, d, conn);
    return repo.timNcc(ma, conn);
  });
}

// Xóa: chặn nếu đã có PhieuNhap (409). KHO-04 sẽ khóa dòng NCC trước khi lập phiếu nên không lọt phiếu vừa lập.
async function xoaNcc(ma) {
  const loiDangDung = () => loi.xungDot('NCC_DA_CO_PHIEU_NHAP', 'Nhà cung cấp đã có phiếu nhập, không thể xóa');
  try {
    return await withTransaction(async conn => {
      if (!(await repo.khoaNcc(ma, conn))) throw loiKhongCoNcc();
      if (await repo.nccDaCoPhieuNhap(ma, conn)) throw loiDangDung();
      await repo.xoaNcc(ma, conn);
      return { ma_ncc: ma, da_xoa: true };
    });
  } catch (e) {
    if (e.errno === ERR_DANG_DUNG) throw loiDangDung();
    throw e;
  }
}

const danhSachNcc = ({ tu_khoa }, phanTrang) => repo.danhSachNcc(tu_khoa, phanTrang);

// ---------- KHO-03: đặt công thức ----------
// Thứ tự khóa: SanPham (FOR UPDATE) -> các NguyenLieu (FOR UPDATE, mã tăng dần). Trùng thứ tự với tạo order (FK SanPham -> truKho khóa nguyên liệu)
// nên không deadlock. Lưu ý: order ĐANG MỞ đã trừ kho theo công thức cũ; nếu hủy/bỏ ly sau đó thì trả kho theo công thức MỚI (không lưu bản chụp công thức).
async function xemCongThuc(maSanPham) {
  const sp = await sanPhamService.layChiTiet(maSanPham);
  return { ma_san_pham: sp.ma_san_pham, ten_san_pham: sp.ten_san_pham, nguyen_lieu: await repo.layCongThuc(maSanPham) };
}

function datCongThuc(maSanPham, nguyenLieu) {
  return withTransaction(async conn => {
    const sp = await sanPhamService.khoaSanPham(maSanPham, conn);
    const dsMa = nguyenLieu.map(d => d.ma_nguyen_lieu).sort((a, b) => a - b);
    if (dsMa.length) {
      const co = new Set((await repo.khoaNguyenLieu(dsMa, conn)).map(r => r.ma_nguyen_lieu));
      const thieu = dsMa.filter(m => !co.has(m));
      if (thieu.length) throw loi.khongTimThay(`Không tìm thấy nguyên liệu: ${thieu.join(', ')}`);
    }
    await repo.xoaCongThuc(maSanPham, conn);
    await repo.themCongThuc(maSanPham, nguyenLieu, conn);
    return { ma_san_pham: sp.ma_san_pham, ten_san_pham: sp.ten_san_pham, nguyen_lieu: await repo.layCongThuc(maSanPham, conn) };
  });
}

// ---------- KHO-04: lập phiếu nhập ----------
// Tiền tính bằng số nguyên (BigInt): milli-đơn vị x xu / 1000, làm tròn nửa lên TỪNG dòng rồi cộng -> không lỗi số thực.
const TOI_DA_TIEN = 99999999999999n;  // DECIMAL(14,2) tính bằng xu: 999.999.999.999,99
const TOI_DA_TON_MILLI = 99999999999999n; // DECIMAL(14,3) tính bằng milli
const milli = n => BigInt(Math.round(n * 1000));
const xu = n => BigInt(Math.round(n * 100));
const thanhTienXu = (sl, gia) => (milli(sl) * xu(gia) + 500n) / 1000n;

// Thứ tự khóa: NhaCungCap (chia sẻ) -> các NguyenLieu (FOR UPDATE, mã tăng dần, cùng thứ tự với truKho/đặt công thức).
function taoPhieuNhap(nguoiDung, { ma_ncc, ngay_nhap, items }) {
  const dong = [...items].sort((a, b) => a.ma_nguyen_lieu - b.ma_nguyen_lieu);
  let tongXu = 0n;
  for (const d of dong) tongXu += thanhTienXu(d.so_luong_nhap, d.don_gia_nhap);
  if (tongXu > TOI_DA_TIEN) throw loi.duLieuSai('Tổng tiền phiếu nhập quá lớn', [{ noi: 'body', truong: 'items', thong_bao: 'tong_tien_nhap vượt giới hạn' }]);
  const tongTien = Number(tongXu) / 100;

  return withTransaction(async conn => {
    if (!(await repo.khoaNccDeLapPhieu(ma_ncc, conn))) throw loi.khongTimThay('Không tìm thấy nhà cung cấp');
    const khoa = await repo.khoaNguyenLieu(dong.map(d => d.ma_nguyen_lieu), conn);
    const theoMa = new Map(khoa.map(r => [r.ma_nguyen_lieu, r]));
    const thieu = dong.filter(d => !theoMa.has(d.ma_nguyen_lieu)).map(d => d.ma_nguyen_lieu);
    if (thieu.length) throw loi.khongTimThay(`Không tìm thấy nguyên liệu: ${thieu.join(', ')}`);

    const tonMoi = dong.map(d => {
      const nl = theoMa.get(d.ma_nguyen_lieu);
      const moi = milli(nl.so_luong_ton) + milli(d.so_luong_nhap);
      if (moi > TOI_DA_TON_MILLI) throw loi.xungDot('TON_KHO_VUOT_GIOI_HAN', `Tồn kho của "${nl.ten_nguyen_lieu}" sau khi nhập vượt giới hạn lưu trữ`);
      return { nl, moi: Number(moi) / 1000 };
    });

    const maPhieu = await repo.taoPhieuNhap({ ma_ncc, ma_nhan_vien: nguoiDung.ma_nhan_vien, ngay_nhap, tong_tien_nhap: tongTien }, conn);
    await repo.themChiTietNhap(maPhieu, dong, conn);
    for (let i = 0; i < dong.length; i++) await repo.congTon(dong[i].ma_nguyen_lieu, dong[i].so_luong_nhap, conn);

    const phieu = await repo.timPhieuNhap(maPhieu, conn);
    return {
      ma_phieu_nhap: maPhieu, ma_ncc, ten_ncc: phieu.ten_ncc, ngay_nhap: phieu.ngay_nhap, tong_tien_nhap: phieu.tong_tien_nhap,
      chi_tiet: await repo.layChiTietNhap(maPhieu, conn),
      ton_moi: tonMoi.map(({ nl, moi }) => ({
        ma_nguyen_lieu: nl.ma_nguyen_lieu, ten_nguyen_lieu: nl.ten_nguyen_lieu, don_vi_tinh: nl.don_vi_tinh,
        so_luong_ton: moi, muc_ton_toi_thieu: nl.muc_ton_toi_thieu, sap_het: moi <= nl.muc_ton_toi_thieu,
      })),
    };
  });
}

// ---------- KHO-05 ----------
async function chiTietPhieuNhap(ma) {
  const p = await repo.timPhieuNhap(ma);
  if (!p) throw loi.khongTimThay('Không tìm thấy phiếu nhập');
  return { ...p, chi_tiet: await repo.layChiTietNhap(ma) };
}
const lichSuNhap = (loc, phanTrang) => repo.lichSuNhap(loc, phanTrang);

module.exports = {
  xemCongThuc, datCongThuc, taoPhieuNhap, chiTietPhieuNhap, lichSuNhap,
  tinhNhuCau, tinhThieu, truKho, traKho,
  layNguyenLieu, taoNguyenLieu, suaNguyenLieu, xoaNguyenLieu, danhSachNguyenLieu, tonKho,
  layNcc, taoNcc, suaNcc, xoaNcc, danhSachNcc,
};
