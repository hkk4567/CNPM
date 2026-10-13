// Biểu đồ dùng cho Báo cáo, vẽ bằng SVG/HTML thuần (không thêm thư viện).
//  - CotChart: biểu đồ cột (1 hoặc nhiều chuỗi), cột <= 24px, đầu cột bo 4px, trục gốc 0, lưới mảnh, nhãn thưa (chỉ nhãn đỉnh cao nhất khi 1 chuỗi).
//  - ThanhNgang: xếp hạng nằm ngang, mỗi mục một màu duy nhất (danh mục không có thứ tự -> không tô dải màu theo giá trị).
//  - TheBieuDo: khung có nút chuyển "Biểu đồ / Bảng"; BangSo: bảng thay thế cho người không dùng chuột; ChiSo: dải số liệu đầu trang.
// Hover/focus hiện chú giải (Tip); mọi giá trị trong chú giải đều có thêm ở dạng Bảng nên không bị phụ thuộc vào hover.
import { useRef, useState } from 'react';
import { tickDep, tienGon } from '../utils/format.js';

export const MAU = { chinh: '#1B6B63', doanhThu: '#0E9080', chiPhi: '#C9861A' }; // chinh = màu thương hiệu (bản mẫu); hai màu sau đã chạy validate_palette (đạt 4/5 kiểm tra, độ tương phản nâu < 3:1 -> có chú giải + bảng)

// ---- Chú giải khi rê chuột / focus ----
export function useTip() {
  const goc = useRef(null);
  const [tip, setTip] = useState(null);
  const hien = (e, noiDung) => {
    const r = goc.current.getBoundingClientRect();
    const dung = e.clientX || e.clientY; // chuột; focus bàn phím thì lấy giữa phần tử
    const b = e.currentTarget.getBoundingClientRect();
    setTip({ x: (dung ? e.clientX : b.left + b.width / 2) - r.left, y: (dung ? e.clientY : b.top) - r.top, noiDung });
  };
  const an = () => setTip(null);
  const khung = { ref: goc, className: 'bd-khung' };
  const tipEl = tip && (
    <div className="bd-tip" role="status" style={{ left: tip.x, top: tip.y, transform: `translate(${tip.x > (goc.current?.clientWidth ?? 0) * 0.65 ? 'calc(-100% - 12px)' : '12px'}, -110%)` }}>
      <strong>{tip.noiDung.tieuDe}</strong>
      {tip.noiDung.dong.map((d, i) => (
        <span key={i} className="bd-tip-dong">{d.mau && <i style={{ background: d.mau }} />}<span>{d.nhan}</span><b>{d.giaTri}</b></span>
      ))}
    </div>
  );
  return { hien, an, khung, tipEl };
}

// ---- Biểu đồ cột ----
// ky: [{ khoa, nhan, gia: [số theo từng chuỗi], mo?: true (cột nhạt = kỳ chưa kết thúc), tip: { tieuDe, dong[] } }]; chuoi: [{ ten, mau }]
export function CotChart({ ky, chuoi, moTa }) {
  const { hien, an, khung, tipEl } = useTip();
  const [dong, setDong] = useState(-1);
  const W = 760; const H = 290; const trai = 60; const phai = 16; const tren = 26; const day = 252;
  const n = ky.length; const band = (W - trai - phai) / Math.max(n, 1);
  const lonNhat = Math.max(0, ...ky.flatMap(k => k.gia));
  const { max, ticks } = tickDep(lonNhat);
  const yOf = v => day - (v / max) * (day - tren);
  const rongCot = Math.min(chuoi.length > 1 ? 18 : 24, (band * 0.62) / chuoi.length);
  const nhomRong = rongCot * chuoi.length + 2 * (chuoi.length - 1);
  const buoc = Math.max(1, Math.ceil(54 / band)); // nhãn trục X thưa ra cho khỏi chồng
  const dinh = chuoi.length === 1 ? ky.reduce((b, k, i) => (k.gia[0] > (ky[b]?.gia[0] ?? -1) ? i : b), 0) : -1;

  const cot = (x, v, mau, mo, key) => {
    const h = day - yOf(v);
    if (!(h > 0)) return null;
    const r = Math.min(4, h);
    return <path key={key} d={`M${x} ${day}V${yOf(v) + r}Q${x} ${yOf(v)} ${x + r} ${yOf(v)}H${x + rongCot - r}Q${x + rongCot} ${yOf(v)} ${x + rongCot} ${yOf(v) + r}V${day}Z`} fill={mau} fillOpacity={mo ? 0.45 : 1} />;
  };

  return (
    <div {...khung}>
      <div className="bd-cuon">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="group" aria-label={moTa} style={{ display: 'block' }} onPointerLeave={() => { an(); setDong(-1); }}>
        <g stroke="#E4EAE8" strokeWidth="1">{ticks.slice(1).map(t => <line key={t} x1={trai} x2={W - phai} y1={yOf(t)} y2={yOf(t)} />)}</g>
        <line x1={trai} x2={W - phai} y1={day} y2={day} stroke="#B9C6C3" strokeWidth="1" />
        <g fontSize="12" fill="#5B6B69" textAnchor="end">{ticks.map(t => <text key={t} x={trai - 8} y={yOf(t) + 4}>{tienGon(t)}</text>)}</g>
        {dong >= 0 && <rect x={trai + band * dong} y={tren - 8} width={band} height={day - tren + 8} fill="#F2F8F7" />}
        {ky.map((k, i) => {
          const x0 = trai + band * i + (band - nhomRong) / 2;
          return <g key={k.khoa}>{k.gia.map((v, s) => cot(x0 + s * (rongCot + 2), v, chuoi[s].mau, k.mo, s))}</g>;
        })}
        {dinh >= 0 && ky[dinh].gia[0] > 0 && <text x={trai + band * dinh + band / 2} y={yOf(ky[dinh].gia[0]) - 6} fontSize="12" fontWeight="600" fill="#1A2B2A" textAnchor="middle">{tienGon(ky[dinh].gia[0], 2)}</text>}
        <g fontSize="12" fill="#5B6B69" textAnchor="middle">
          {ky.map((k, i) => (i % buoc === 0 ? <text key={k.khoa} x={trai + band * i + band / 2} y={274}>{k.nhan}</text> : null))}
        </g>
        {/* vùng bắt chuột/focus rộng bằng cả một kỳ, lớn hơn cột */}
        {ky.map((k, i) => (
          <rect key={k.khoa} x={trai + band * i} y={tren - 8} width={band} height={day - tren + 8} fill="transparent"
                tabIndex={n <= 31 ? 0 : undefined} aria-label={`${k.tip.tieuDe}: ${k.tip.dong.map(d => `${d.nhan} ${d.giaTri}`).join(', ')}`}
                onPointerMove={e => { setDong(i); hien(e, k.tip); }} onFocus={e => { setDong(i); hien(e, k.tip); }} onBlur={() => { an(); setDong(-1); }} />
        ))}
      </svg>
      </div>
      {tipEl}
    </div>
  );
}

// ---- Xếp hạng nằm ngang ----
// dong: [{ khoa, ten, so (giá trị vẽ), nhan (chữ ở đầu thanh), tip }]
export function ThanhNgang({ dong, mau = MAU.chinh, tenDanhSach }) {
  const { hien, an, khung, tipEl } = useTip();
  const lonNhat = Math.max(0, ...dong.map(d => d.so));
  return (
    <div {...khung}>
      <ul className="hbar" aria-label={tenDanhSach}>
        {dong.map(d => (
          <li key={d.khoa} tabIndex={0} aria-label={`${d.ten}: ${d.nhan}`}
              onPointerMove={e => hien(e, d.tip)} onPointerLeave={an} onFocus={e => hien(e, d.tip)} onBlur={an}>
            <span className="hbar-ten">{d.ten}</span>
            <span className="hbar-vet">
              <span className="hbar-cot" style={{ '--p': lonNhat > 0 ? d.so / lonNhat : 0, background: mau }} />
              <span className="hbar-gt">{d.nhan}</span>
            </span>
          </li>
        ))}
      </ul>
      {tipEl}
    </div>
  );
}

// ---- Khung thẻ có nút chuyển Biểu đồ / Bảng ----
export function TheBieuDo({ tieuDe, chuThich, chuGiai, children, bang }) {
  const [xem, setXem] = useState('bieu-do');
  return (
    <section className="the bd-the" aria-label={tieuDe}>
      <div className="bd-dau">
        <h2>{tieuDe}</h2>
        <div className="chuyen-dang" role="group" aria-label="Cách xem">
          <button type="button" aria-pressed={xem === 'bieu-do'} onClick={() => setXem('bieu-do')}>Biểu đồ</button>
          <button type="button" aria-pressed={xem === 'bang'} onClick={() => setXem('bang')}>Bảng</button>
        </div>
      </div>
      {chuGiai && xem === 'bieu-do' && (
        <ul className="bd-chu-giai" aria-label="Chú giải">{chuGiai.map(c => <li key={c.ten}><i style={{ background: c.mau }} />{c.ten}</li>)}</ul>
      )}
      {xem === 'bieu-do' ? children : bang}
      {chuThich && <p className="goi-y">{chuThich}</p>}
    </section>
  );
}

// ---- Bảng thay thế: cot [{ khoa, tieuDe, canPhai, hienThi }] ----
export function BangSo({ cot, dong, khoaDong, ten }) {
  return (
    <div className="bang-boc">
      <table className="bang bang-nho" aria-label={ten}>
        <thead><tr>{cot.map(c => <th key={c.khoa} scope="col" className={c.canPhai ? 'phai' : undefined}>{c.tieuDe}</th>)}</tr></thead>
        <tbody>{dong.map(d => <tr key={d[khoaDong]}>{cot.map(c => <td key={c.khoa} className={c.canPhai ? 'phai' : undefined}>{c.hienThi ? c.hienThi(d) : d[c.khoa]}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

// ---- Dải số liệu đầu trang: muc [{ nhan, giaTri, phu? }] ----
export function ChiSo({ muc }) {
  return (
    <div className="chi-so" role="group" aria-label="Số liệu tổng hợp">
      {muc.map(m => (
        <div key={m.nhan}><span>{m.nhan}</span><strong>{m.giaTri}</strong>{m.phu && <small>{m.phu}</small>}</div>
      ))}
    </div>
  );
}
