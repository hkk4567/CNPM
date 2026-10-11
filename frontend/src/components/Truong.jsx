// Một ô nhập có nhãn và thông báo lỗi liên kết bằng aria. Dùng: <Truong id="x" nhan="Tên" loi={loi.ten}>{(p) => <input {...p} />}</Truong>
export default function Truong({ id, nhan, loi, goiY, children }) {
  const p = { id, 'aria-invalid': !!loi, 'aria-describedby': loi ? `${id}-loi` : (goiY ? `${id}-goiy` : undefined) };
  return (
    <div className="truong">
      <label htmlFor={id}>{nhan}</label>
      {children(p)}
      {loi && <span className="loi-truong" id={`${id}-loi`}>{loi}</span>}
      {!loi && goiY && <span className="goi-y" id={`${id}-goiy`}>{goiY}</span>}
    </div>
  );
}
