import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks: {
          'router': ['react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'charts': ['recharts'],
          'i18n': ['i18next', 'react-i18next'],
          'lucide': ['lucide-react'],
          'pdf': ['jspdf', 'jspdf-autotable', 'html2canvas'],
        },
      },
    },
  },
})
