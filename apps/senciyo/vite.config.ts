// vite.config.ts
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    open: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8789',
        changeOrigin: false,
      },
    },
  },
  preview: {
    port: 5175,
    strictPort: true
  },
  build: {
    // Excel y analytics son features reales del producto y generan chunks grandes por diseño.
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          state: ['zustand'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          charts: ['recharts'],
          excel: ['xlsx', 'exceljs'],
          analytics: ['posthog-js', '@amplitude/analytics-browser', 'mixpanel-browser'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable'],
          ui: ['lucide-react'],
        },
      },
    },
  }
})
