// useApi(ham, [phụ thuộc]): chạy ham() khi phụ thuộc đổi; trả { data, loading, error, reload }. Bỏ qua kết quả của lần gọi cũ.
import { useCallback, useEffect, useRef, useState } from 'react';

export function useApi(ham, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lanGoi = useRef(0);
  const hamMoi = useRef(ham);
  hamMoi.current = ham;

  const chay = useCallback(() => {
    const lan = ++lanGoi.current;
    setLoading(true);
    return hamMoi.current()
      .then(d => { if (lan === lanGoi.current) { setData(d); setError(null); } })
      .catch(e => { if (lan === lanGoi.current) setError(e); })
      .finally(() => { if (lan === lanGoi.current) setLoading(false); });
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { chay(); }, deps);

  return { data, loading, error, reload: chay };
}
