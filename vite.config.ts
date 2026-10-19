import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:5088',
      '/health': 'http://localhost:5088',
    },
    watch: {
      ignored: ['**/server/**/bin/**', '**/server/**/obj/**'],
    },
  },
  build: {
    outDir: 'server/FamiRepere.Server/wwwroot',
    emptyOutDir: true,
  },
});
