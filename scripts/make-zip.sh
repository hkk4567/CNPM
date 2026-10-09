#!/bin/bash
# scripts/make-zip.sh – đóng gói toàn bộ dự án thành <tên thư mục dự án>.zip (đặt cạnh thư mục dự án).
# Tên thư mục lấy tự động (cafe_management, CNPM-main...). Bỏ qua node_modules, .env (chứa mật khẩu/khóa), dist, log.
# Chạy từ thư mục dự án:  bash scripts/make-zip.sh
set -e
GOC="$(cd "$(dirname "$0")/.." && pwd)"
TEN="$(basename "$GOC")"
cd "$GOC/.."
rm -f "$TEN.zip"
zip -r -q "$TEN.zip" "$TEN" \
  -x "$TEN/node_modules/*" "$TEN/*/node_modules/*" \
     "$TEN/.env" "$TEN/*/.env" \
     "$TEN/*/dist/*" "*.log"
echo "Đã tạo $(pwd)/$TEN.zip"
