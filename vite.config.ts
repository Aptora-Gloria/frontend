import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM ortamında __dirname oluştur
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],

  // ---- ✅ ALIAS TAM DOĞRU ŞEKİLDE AYARLANDI ----
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  // ---- 🔥 Backend proxy ayarları ----
  server: {
    proxy: {
      // API için
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      // Auth için
      '/auth/login': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/auth/me': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
