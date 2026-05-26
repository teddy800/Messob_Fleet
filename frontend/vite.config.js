import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 3000,
      overlay: false, // Disable error overlay for WebSocket issues
    },
    proxy: {
      '/odoo': {
        target: 'http://localhost:8018',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/odoo/, ''),
      },
    },
  },
})
