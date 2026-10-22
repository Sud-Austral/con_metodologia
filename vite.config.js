import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/con_metodologia/',
  test: {
    environment: 'jsdom',
    globals: true,
  },
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm']
  },
  build: {
    rollupOptions: {
      external: [],
    }
  }
})
