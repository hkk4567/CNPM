#!/bin/bash
# scripts/stress-hoa-don.sh – mô phỏng "một tiến trình khác" liên tục thêm hóa đơn để kiểm tra test có bị lệch số liệu
# khi nhiều file test chạy song song (đã dùng để tái hiện lỗi 2 test của hoa-don.test.js).
# Cách dùng (cần client mysql; XAMPP: đặt MYSQL_BIN="/c/xampp/mysql/bin/mysql" khi chạy bằng Git Bash):
#   Cửa sổ 1:  bash scripts/stress-hoa-don.sh          (chạy tới khi nhấn Ctrl+C, tự dọn dữ liệu thêm vào)
#   Cửa sổ 2:  cd backend && npm test                  (kỳ vọng vẫn 100% qua)
MYSQL_BIN="${MYSQL_BIN:-mysql}"
DB="${DB_NAME:-cafe_management}"
USER_DB="${DB_USER:-root}"
don_dep() { "$MYSQL_BIN" -u"$USER_DB" "$DB" -e "DELETE FROM HoaDon WHERE so_thu_tu >= 60000 AND thoi_gian_tao < NOW() - INTERVAL 1 DAY" 2>/dev/null; echo; echo "Đã dọn dữ liệu thử."; exit 0; }
trap don_dep INT TERM
echo "Đang thêm hóa đơn giả liên tục (5 ngày trước, so_thu_tu >= 60000). Nhấn Ctrl+C để dừng."
i=0
while true; do
  i=$((i+1))
  "$MYSQL_BIN" -u"$USER_DB" "$DB" -e "INSERT INTO HoaDon (ma_nhan_vien, so_thu_tu, thoi_gian_tao) VALUES (4, 60000+$i, NOW() - INTERVAL 5 DAY)" 2>/dev/null
done
