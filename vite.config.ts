import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Allows external access from your phone browser over Wi-Fi
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Fixes mobile WebSocket HMR connection issues
    hmr: {
      host: 'localhost', 
    },
    // Routes /api requests to your FastAPI backend automatically
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', 
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    sourcemap: true,
  },
});
