import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// En desarrollo, /api y /uploads se redirigen al backend FastAPI (puerto 8000)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
      '/uploads': 'http://localhost:8000',
    },
  },
})
