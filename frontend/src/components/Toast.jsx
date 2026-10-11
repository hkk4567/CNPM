// Thông báo nổi ngắn (thành công / lỗi). Dùng: const { thongBao } = useToast(); thongBao('Đã lưu'); thongBao('Lỗi...', 'loi').
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [ds, setDs] = useState([]);
  const dem = useRef(0);

  const thongBao = useCallback((noiDung, loai = 'ok') => {
    const id = ++dem.current;
    setDs(x => [...x, { id, noiDung, loai }]);
    setTimeout(() => setDs(x => x.filter(t => t.id !== id)), loai === 'loi' ? 7000 : 4000);
  }, []);

  const giaTri = useMemo(() => ({ thongBao }), [thongBao]);
  return (
    <ToastContext.Provider value={giaTri}>
      {children}
      <div className="toast-khung" role="status" aria-live="polite">
        {ds.map(t => <div key={t.id} className={`toast${t.loai === 'loi' ? ' toast-loi' : ''}`}>{t.noiDung}</div>)}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
