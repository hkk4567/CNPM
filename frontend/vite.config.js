// Cấu hình Vite: chạy dev ở cổng 5173 (khớp CORS_ORIGIN của backend) và chuyển /api sang backend (cổng 3000).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
});
