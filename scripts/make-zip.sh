#!/bin/bash
# scripts/make-zip.sh – đóng gói toàn bộ dự án thành cafe_management.zip (đặt cạnh thư mục dự án).
# Bỏ qua node_modules, .env (chứa mật khẩu/khóa), dist, log.
# Chạy từ thư mục cafe_management/:  bash scripts/make-zip.sh
set -e
cd "$(dirname "$0")/../.."
rm -f cafe_management.zip
zip -r -q cafe_management.zip cafe_management \
  -x "cafe_management/node_modules/*" "cafe_management/*/node_modules/*" \
     "cafe_management/.env" "cafe_management/*/.env" \
     "cafe_management/*/dist/*" "*.log"
echo "Đã tạo $(pwd)/cafe_management.zip"
