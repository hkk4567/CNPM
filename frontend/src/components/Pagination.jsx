// Phân trang dùng chung: "Trang 2 / 5 – 47 bản ghi" kèm nút Trước / Sau.
export default function Pagination({ trang, moiTrang, tong, onDoi }) {
  const tongTrang = Math.max(1, Math.ceil(tong / moiTrang));
  if (tong === 0) return null;
  return (
    <nav className="phan-trang" aria-label="Phân trang">
      <span>Trang {trang} / {tongTrang} – {tong} bản ghi</span>
      <div className="hang-nut">
        <button type="button" className="btn btn-sm" disabled={trang <= 1} onClick={() => onDoi(trang - 1)}>Trước</button>
        <button type="button" className="btn btn-sm" disabled={trang >= tongTrang} onClick={() => onDoi(trang + 1)}>Sau</button>
      </div>
    </nav>
  );
}
