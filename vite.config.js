
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Vercel requires absolute path for history fallback to work correctly
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 3000,
    open: false,
  }
})
