// Lỗi CSDL mà chạy lại câu lệnh/giao dịch là an toàn: CSDL đã hủy hoàn toàn phần việc dở.
//   1213 ER_LOCK_DEADLOCK: bị chọn làm "nạn nhân" của deadlock.
//   1412 ER_TABLE_DEF_CHANGED: bảng bị đổi định nghĩa (DDL như tháo/dựng trigger) giữa chừng.
const MA_LOI = new Set([1213, 1412]);
const laLoiThuLai = e => !!e && MA_LOI.has(e.errno);
module.exports = { laLoiThuLai };
