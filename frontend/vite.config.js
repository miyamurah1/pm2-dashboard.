import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api':    'http://localhost:3000',
      '/login':  'http://localhost:3000',
      '/logout': 'http://localhost:3000',

      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,           // tells Vite to treat this as a WebSocket proxy
        changeOrigin: true,
      }
    }
  }
})