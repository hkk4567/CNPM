// Gốc ứng dụng: bọc các Provider (đăng nhập, thông báo) rồi tới bảng route.
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import { TrangAnProvider } from './context/TrangAnContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <TrangAnProvider>
          <AppRoutes />
        </TrangAnProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
