// Bảng dữ liệu dùng chung. cot: [{ khoa, tieuDe, hienThi?(dong), canPhai? }]. Bấm hàng (hoặc Enter) gọi onChonDong.
export default function DataTable({ cot, dong, khoaDong, dangChon, onChonDong, dangTai, trong = 'Không có dữ liệu', tenBang }) {
  return (
    <div className="bang-boc">
      <table className="bang" aria-label={tenBang} aria-busy={dangTai}>
        <thead>
          <tr>{cot.map(c => <th key={c.khoa} scope="col" className={c.canPhai ? 'phai' : undefined}>{c.tieuDe}</th>)}</tr>
        </thead>
        <tbody>
          {dong.map(d => {
            const k = d[khoaDong];
            const chon = dangChon === k;
            const mo = (d.__mo ? ' mo' : '') + (d.__canhBao ? ' canh-bao-dong' : '');
            return (
              <tr key={k} className={`${onChonDong ? 'bam' : ''}${chon ? ' chon' : ''}${mo}`}
                  tabIndex={onChonDong ? 0 : undefined} aria-selected={onChonDong ? chon : undefined}
                  onClick={onChonDong ? () => onChonDong(d) : undefined}
                  onKeyDown={onChonDong ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChonDong(d); } } : undefined}>
                {cot.map(c => <td key={c.khoa} className={c.canPhai ? 'phai' : undefined}>{c.hienThi ? c.hienThi(d) : d[c.khoa]}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
      {!dong.length && <div className="bang-rong">{dangTai ? 'Đang tải…' : trong}</div>}
    </div>
  );
}
