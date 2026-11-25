import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In development, /api and /media are proxied to the FastAPI server.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
      '/media': 'http://localhost:8000',
    },
  },
})
