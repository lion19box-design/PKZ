import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Статические страницы для поисковиков собираются рядом с SPA
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        pravila: resolve(import.meta.dirname, 'pravila/index.html'),
        oIgre: resolve(import.meta.dirname, 'o-igre/index.html'),
      },
    },
  },
  server: {
    port: 3000,
    watch: {
      ignored: ['**/public/assets/**']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      }
    }
  }
});
