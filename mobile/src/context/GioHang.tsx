// Giỏ gọi món: giữ trong bộ nhớ khi chuyển màn. "dich" = order đang mở cần thêm món vào (null = tạo order mới).
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { MonMenu } from '../api/menu';
import type { CanhBaoKho } from '../api/hoa-don';

export const TOI_DA_MOI_DONG = 99;
export type DongGio = { ma_san_pham: number; ten_san_pham: string; gia_ban: number; gia_sau_giam: number; so_luong: number; ghi_chu: string; toi_da: number };
export type DichThem = { ma_hoa_don: number; so_thu_tu: number } | null;

type GiaTri = {
  dong: DongGio[]; dich: DichThem; tongLy: number; tamTinh: number; canhBaoKho: CanhBaoKho[];
  soLuongCua: (ma: number) => number;
  them: (mon: MonMenu) => void; tang: (ma: number) => void; giam: (ma: number) => void;
  datGhiChu: (ma: number, g: string) => void; bo: (ma: number) => void;
  boDaGui: (ma: number[]) => void; xoaHet: () => void;
  datDich: (d: DichThem) => void; datCanhBaoKho: (c: CanhBaoKho[]) => void;
};
const Ctx = createContext<GiaTri | null>(null);
export const useGioHang = () => { const c = useContext(Ctx); if (!c) throw new Error('useGioHang ngoài GioHangProvider'); return c; };

export function GioHangProvider({ children }: { children: ReactNode }) {
  const [dong, setDong] = useState<DongGio[]>([]);
  const [dich, datDich] = useState<DichThem>(null);
  const [canhBaoKho, datCanhBaoKho] = useState<CanhBaoKho[]>([]);

  const them = useCallback((mon: MonMenu) => setDong((d) => {
    const toiDa = Math.min(TOI_DA_MOI_DONG, mon.so_ly_toi_da ?? TOI_DA_MOI_DONG);
    const i = d.findIndex((x) => x.ma_san_pham === mon.ma_san_pham);
    if (i < 0) return toiDa < 1 ? d : [...d, { ma_san_pham: mon.ma_san_pham, ten_san_pham: mon.ten_san_pham, gia_ban: mon.gia_ban, gia_sau_giam: mon.gia_sau_giam, so_luong: 1, ghi_chu: '', toi_da: toiDa }];
    return d.map((x, j) => (j === i ? { ...x, toi_da: toiDa, so_luong: Math.min(x.so_luong + 1, toiDa) } : x));
  }), []);
  const tang = useCallback((ma: number) => setDong((d) => d.map((x) => (x.ma_san_pham === ma ? { ...x, so_luong: Math.min(x.so_luong + 1, x.toi_da) } : x))), []);
  const giam = useCallback((ma: number) => setDong((d) => d.flatMap((x) => (x.ma_san_pham !== ma ? [x] : x.so_luong <= 1 ? [] : [{ ...x, so_luong: x.so_luong - 1 }]))), []);
  const datGhiChu = useCallback((ma: number, g: string) => setDong((d) => d.map((x) => (x.ma_san_pham === ma ? { ...x, ghi_chu: g } : x))), []);
  const bo = useCallback((ma: number) => setDong((d) => d.filter((x) => x.ma_san_pham !== ma)), []);
  const boDaGui = useCallback((ma: number[]) => setDong((d) => d.filter((x) => !ma.includes(x.ma_san_pham))), []);
  const xoaHet = useCallback(() => setDong([]), []);

  const giaTri = useMemo<GiaTri>(() => ({
    dong, dich, canhBaoKho,
    tongLy: dong.reduce((s, x) => s + x.so_luong, 0),
    tamTinh: dong.reduce((s, x) => s + x.so_luong * x.gia_sau_giam, 0),
    soLuongCua: (ma) => dong.find((x) => x.ma_san_pham === ma)?.so_luong ?? 0,
    them, tang, giam, datGhiChu, bo, boDaGui, xoaHet, datDich, datCanhBaoKho,
  }), [dong, dich, canhBaoKho, them, tang, giam, datGhiChu, bo, boDaGui, xoaHet]);
  return <Ctx.Provider value={giaTri}>{children}</Ctx.Provider>;
}

