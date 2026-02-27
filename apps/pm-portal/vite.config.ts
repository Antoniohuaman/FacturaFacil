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
    port: 5177,
    strictPort: true
  },
  preview: {
    port: 5178,
    strictPort: true
  },
  build: {
    chunkSizeWarningLimit: 1200
  }
})
