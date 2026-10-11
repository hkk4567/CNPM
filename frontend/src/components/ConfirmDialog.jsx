// Hộp xác nhận (xóa, hủy order). Nút mặc định được chọn là "Quay lại" để tránh bấm nhầm thao tác nguy hiểm.
import Dialog from './Dialog.jsx';

export default function ConfirmDialog({ tieuDe, noiDung, nhanXacNhan = 'Đồng ý', nguyHiem = false, dangXuLy = false, onXacNhan, onHuy }) {
  return (
    <Dialog tieuDe={tieuDe} onDong={onHuy}>
      <p>{noiDung}</p>
      <div className="hop-nut">
        <button type="button" className="btn" data-autofocus onClick={onHuy} disabled={dangXuLy}>Quay lại</button>
        <button type="button" className={`btn ${nguyHiem ? 'btn-danger-solid' : 'btn-primary'}`} onClick={onXacNhan} disabled={dangXuLy}>
          {dangXuLy ? 'Đang xử lý…' : nhanXacNhan}
        </button>
      </div>
    </Dialog>
  );
}
