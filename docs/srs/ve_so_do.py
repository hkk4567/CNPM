#!/usr/bin/env python3
"""Vẽ sơ đồ vào/ra cho từng chức năng (bố cục theo hình phác thảo của nhóm).

Chạy:  python3 ve_so_do.py            (cần: pip install matplotlib)
Đầu vào : du_lieu/*.json              (mô tả từng chức năng, xem 00_meta.json)
Đầu ra  : so_do/<ID>.png và so_do/_mau.png (sơ đồ mẫu cho phần hướng dẫn đọc)

Bố cục (trái -> phải):
  Trái : thiết bị đầu vào, dữ liệu đầu vào, dữ liệu độc lập (đọc từ CSDL)
  Giữa : hình ê-líp "Xử lý (chức năng)"
  Phải : thiết bị đầu ra, dữ liệu đầu ra, dữ liệu lưu xuống CSDL
  Dưới : thanh database và dòng "Xử lý: công thức tính toán, so sánh điều kiện"
"""
import json, os, sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import FancyBboxPatch, Ellipse, FancyArrowPatch

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "so_do")
W, H = 10.2, 5.4          # inch; chèn vào Word rộng 9,6" nên chữ giữ đúng cỡ
DPI = 200

# chọn font có dấu tiếng Việt: ưu tiên font quen thuộc trên Windows, cuối cùng là DejaVu
_avail = {f.name for f in font_manager.fontManager.ttflist}
FONT = next((f for f in ["Arial", "Segoe UI", "Calibri", "DejaVu Sans"] if f in _avail), "DejaVu Sans")
plt.rcParams["font.family"] = FONT

COL = {
    "vao": ("#EAF1FB", "#2F5597"),
    "ra": ("#EAF6EC", "#2E7D32"),
    "csdl": ("#FFF4E0", "#B26A00"),
}
DEFAULT_TB_VAO = "Bàn phím, chuột (giao diện web)"
DEFAULT_TB_RA = "Màn hình trình duyệt"


class Painter:
    def __init__(self):
        self.fig = plt.figure(figsize=(W, H), dpi=DPI)
        self.ax = self.fig.add_axes([0, 0, 1, 1])
        self.ax.set_xlim(0, W); self.ax.set_ylim(0, H); self.ax.axis("off")
        self.r = self.fig.canvas.get_renderer()
        self.warn = []

    def width(self, s, fs, bold=False):
        t = self.ax.text(0, 0, s, fontsize=fs, fontweight="bold" if bold else "normal")
        w = t.get_window_extent(self.r).width / DPI
        t.remove()
        return w

    def wrap(self, s, fs, maxw, bold=False):
        lines, cur = [], ""
        for w in s.split(" "):
            trial = (cur + " " + w).strip()
            if cur and self.width(trial, fs, bold) > maxw:
                lines.append(cur); cur = w
            else:
                cur = trial
        if cur:
            lines.append(cur)
        return lines

    def box(self, x, y, w, h, title, items, kind, bullets=True):
        fill, edge = COL[kind]
        self.ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0,rounding_size=0.08",
                                         fc=fill, ec=edge, lw=1.2))
        self.ax.text(x + 0.1, y + h - 0.07, title, fontsize=9, fontweight="bold", color=edge, va="top")
        indent = 0.13 if bullets else 0
        for fs in (8.5, 8.0, 7.5, 7.0):
            lh = fs * 1.28 / 72
            laid = [self.wrap(it, fs, w - 0.2 - indent) for it in items]
            n = sum(len(l) for l in laid)
            if 0.34 + n * lh + 0.06 <= h:
                break
        else:
            self.warn.append(f"'{title}' tràn hộp, đã cắt bớt")
        cap = int((h - 0.4) / lh)
        y_cur = y + h - 0.34
        used = 0
        for lines in laid:
            for k, ln in enumerate(lines):
                if used >= cap:
                    break
                if bullets and k == 0:
                    self.ax.text(x + 0.1, y_cur, "•", fontsize=fs, va="top", color="#333")
                self.ax.text(x + 0.1 + indent, y_cur, ln, fontsize=fs, va="top", color="#111")
                y_cur -= lh; used += 1

    def arrow(self, a, b, color="#444", rad=0.0, label=None, lx=0, ly=0):
        self.ax.add_patch(FancyArrowPatch(a, b, arrowstyle="-|>", mutation_scale=13, lw=1.4,
                                          color=color, connectionstyle=f"arc3,rad={rad}", shrinkA=0, shrinkB=0))
        if label:
            self.ax.text((a[0] + b[0]) / 2 + lx, (a[1] + b[1]) / 2 + ly, label, fontsize=7.5,
                         style="italic", color=color, ha="center", va="center")


def ve(fn, path):
    p = Painter()
    ax = p.ax
    LX, RX, BW = 0.10, 7.10, 3.00           # hộp trái / phải
    cx, cy, rx, ry = 5.10, 3.45, 1.50, 1.15  # ê-líp xử lý

    # ê-líp
    ax.add_patch(Ellipse((cx, cy), 2 * rx, 2 * ry, fc="#FFFBE6", ec="#7A5C00", lw=1.6))
    ax.text(cx, cy + 0.80, "XỬ LÝ", ha="center", va="center", fontsize=10, fontweight="bold", color="#7A5C00")
    ax.text(cx, cy + 0.58, "(chức năng)", ha="center", va="center", fontsize=8, color="#7A5C00")
    ax.text(cx, cy + 0.33, fn["id"], ha="center", va="center", fontsize=11, fontweight="bold", color="#222")
    name = p.wrap(fn["ten"], 8.5, 2.1, bold=True)[:3]
    for i, ln in enumerate(name):
        ax.text(cx, cy + 0.05 - i * 0.2, ln, ha="center", va="center", fontsize=8.5, fontweight="bold", color="#222")

    # hộp trái
    p.box(LX, 4.45, BW, 0.85, "Thiết bị đầu vào", [fn.get("tb_vao", DEFAULT_TB_VAO)], "vao", bullets=False)
    p.box(LX, 2.45, BW, 1.85, "Dữ liệu đầu vào", fn["dl_vao"], "vao")
    p.box(LX, 1.10, BW, 1.20, "Dữ liệu độc lập (đọc từ CSDL)", fn["dl_doc"], "csdl")
    # hộp phải
    p.box(RX, 4.45, BW, 0.85, "Thiết bị đầu ra", [fn.get("tb_ra", DEFAULT_TB_RA)], "ra", bullets=False)
    p.box(RX, 2.45, BW, 1.85, "Dữ liệu đầu ra", fn["dl_ra"], "ra")
    p.box(RX, 1.10, BW, 1.20, "Dữ liệu lưu xuống CSDL", fn["dl_luu"], "csdl")

    # mũi tên vào ê-líp
    p.arrow((LX + BW, 4.88), (cx - 1.12, cy + 0.86), "#2F5597")
    p.arrow((LX + BW, 3.37), (cx - rx, cy - 0.05), "#2F5597")
    p.arrow((LX + BW, 1.70), (cx - 0.95, cy - 0.88), "#B26A00")
    # mũi tên ra khỏi ê-líp
    p.arrow((cx + 1.12, cy + 0.86), (RX, 4.88), "#2E7D32")
    p.arrow((cx + rx, cy - 0.05), (RX, 3.37), "#2E7D32")
    p.arrow((cx + 0.95, cy - 0.88), (RX, 1.70), "#B26A00")

    # thanh database
    ax.add_patch(FancyBboxPatch((0.10, 0.52), 10.0, 0.34, boxstyle="round,pad=0,rounding_size=0.06",
                                fc="#5B4B2E", ec="#3B2F18", lw=1.2))
    ax.text(5.10, 0.69, "DATABASE  (cafe_management)", ha="center", va="center", fontsize=9.5,
            fontweight="bold", color="white")
    p.arrow((LX + BW / 2, 0.86), (LX + BW / 2, 1.10), "#B26A00", label="đọc", lx=0.28)
    p.arrow((RX + BW / 2, 1.10), (RX + BW / 2, 0.86), "#B26A00", label="ghi", lx=0.28)

    # dòng xử lý
    ax.plot([0.10, 10.10], [0.42, 0.42], color="#999", lw=0.8)
    cap = "Xử lý: " + fn["xu_ly_ngan"].replace("   ", "   |   ")
    lines = p.wrap(cap, 8.5, 9.9)
    if len(lines) > 2:
        p.warn.append("dòng Xử lý quá dài")
    for i, ln in enumerate(lines[:2]):
        ax.text(0.10, 0.34 - i * 0.17, ln, fontsize=8.5, va="top", color="#111",
                fontweight="bold" if i == 0 and False else "normal")

    p.fig.savefig(path, dpi=DPI, facecolor="white")
    plt.close(p.fig)
    try:  # giảm dung lượng ảnh (khoảng 5 lần) nếu có Pillow; không có thì giữ nguyên
        from PIL import Image
        Image.open(path).convert("RGB").quantize(colors=96, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(path, optimize=True)
    except ImportError:
        pass
    return p.warn


def main():
    os.makedirs(OUT, exist_ok=True)
    meta = json.load(open(os.path.join(HERE, "du_lieu", "00_meta.json"), encoding="utf-8"))
    mau = {
        "id": "ID", "ten": "Tên chức năng",
        "dl_vao": ["các trường người dùng nhập vào", "tham số trên đường dẫn / query"],
        "dl_doc": ["bảng và cột đã có sẵn trong CSDL mà chức năng cần đọc"],
        "dl_ra": ["kết quả trả về cho người dùng", "thông báo lỗi (nếu có)"],
        "dl_luu": ["bảng và cột được thêm, sửa hoặc xóa"],
        "xu_ly_ngan": "công thức tính toán, so sánh điều kiện",
    }
    ve(mau, os.path.join(OUT, "_mau.png"))
    n = 0
    for m in meta["modules"]:
        for fn in json.load(open(os.path.join(HERE, "du_lieu", m["file"]), encoding="utf-8")):
            warn = ve(fn, os.path.join(OUT, fn["id"] + ".png"))
            n += 1
            for w in warn:
                print(f"CẢNH BÁO {fn['id']}: {w}")
    print(f"Đã vẽ {n} sơ đồ + sơ đồ mẫu vào {OUT} (font: {FONT})")


if __name__ == "__main__":
    sys.exit(main())
