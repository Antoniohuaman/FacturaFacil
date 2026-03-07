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
    port: 5173,       // usa siempre 5173
    strictPort: true, // si 5173 está ocupado, Vite falla (no cambia a 5174)
    open: true        // opcional: abre el navegador
    // host: true      // opcional: si quieres exponer en red local
  },
  preview: {
    port: 5175,
    strictPort: true
  }
})
