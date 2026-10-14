import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The proxy below exists because api.z.ai currently omits CORS headers on
// OPTIONS preflight, which kills direct browser calls. Routing through the
// dev server makes it a same-origin request.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/zai': {
        target: 'https://api.z.ai',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/zai/, ''),
      },
    },
  },
});
