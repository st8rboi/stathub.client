import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Публичная витрина: отдельный SPA, ходит в тот же WebApi через dev-прокси.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    proxy: {
      // REST витрины — /public/*, отдаём на бэкенд без CORS.
      '/api': {
        target: 'http://localhost:5248',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // SignalR-хаб живёт на /hubs/matches (ws: true обязателен для WebSocket).
      '/hubs': {
        target: 'http://localhost:5248',
        changeOrigin: true,
        ws: true,
      },
      // Логотипы команд и лиг — статика бэкенда.
      '/uploads': {
        target: 'http://localhost:5248',
        changeOrigin: true,
      },
    },
  },
})
