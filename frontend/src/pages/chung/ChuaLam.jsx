// Trang giữ chỗ cho các màn hình làm ở bước sau.
export default function ChuaLam({ ten, ma }) {
  return (
    <div className="trang-trong">
      <h1>{ten}</h1>
      <p>Màn hình này sẽ được làm ở bước sau{ma ? ` (${ma})` : ''}. Chức năng đã có sẵn ở backend.</p>
    </div>
  );
}
