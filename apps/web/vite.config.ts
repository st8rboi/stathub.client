import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // @/ -> src/ (дублируется в tsconfig.app.json)
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // По умолчанию на Windows Vite слушает только IPv6 (::1) — браузер, резолвящий localhost в 127.0.0.1, получает ERR_CONNECTION_REFUSED
    host: '127.0.0.1',
    // Запросы /api/* уходят на бэкенд (без CORS-настроек на сервере)
    proxy: {
      '/api': {
        target: 'http://localhost:5248',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
