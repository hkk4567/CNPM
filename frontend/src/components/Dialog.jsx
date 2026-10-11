// Hộp thoại nền: Esc đóng, bấm nền đóng, giữ tiêu điểm trong hộp, trả tiêu điểm khi đóng.
import { useEffect, useId, useRef } from 'react';

export default function Dialog({ tieuDe, onDong, rong = false, children }) {
  const hopRef = useRef(null);
  const id = useId();
  const dongRef = useRef(onDong);
  dongRef.current = onDong; // giữ hàm đóng mới nhất mà không chạy lại effect (tránh mất tiêu điểm khi cha vẽ lại)

  useEffect(() => {
    const truoc = document.activeElement;
    const hop = hopRef.current;
    const canFocus = () => hop.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [href]');
    (hop.querySelector('[data-autofocus]') || canFocus()[0] || hop).focus();
    const khiBam = e => {
      if (e.key === 'Escape') { e.stopPropagation(); dongRef.current(); return; }
      if (e.key !== 'Tab') return;
      const ds = canFocus();
      if (!ds.length) return;
      const dau = ds[0]; const cuoi = ds[ds.length - 1];
      if (e.shiftKey && document.activeElement === dau) { e.preventDefault(); cuoi.focus(); }
      else if (!e.shiftKey && document.activeElement === cuoi) { e.preventDefault(); dau.focus(); }
    };
    document.addEventListener('keydown', khiBam);
    return () => { document.removeEventListener('keydown', khiBam); truoc?.focus?.(); };
  }, []);

  return (
    <div className="lop-phu" onMouseDown={e => { if (e.target === e.currentTarget) dongRef.current(); }}>
      <div className={`hop${rong ? ' hop-rong' : ''}`} role="dialog" aria-modal="true" aria-labelledby={id} ref={hopRef} tabIndex={-1}>
        <h2 id={id}>{tieuDe}</h2>
        {children}
      </div>
    </div>
  );
}
