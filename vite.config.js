
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
  },
  build: {
    chunkSizeWarningLimit: 2500, // Aumenta o limite de aviso de pacotes do Vite
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Separa os módulos pesados do vendor para cache otimizado na Vercel
            if (id.includes('jspdf')) return 'vendor-pdf';
            if (id.includes('lucide-react')) return 'vendor-ui';
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('react')) return 'vendor-react';
            return 'vendor'; 
          }
        }
      }
    }
  }
})
