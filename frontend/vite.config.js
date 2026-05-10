import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(),],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Socket.io for real-time communication
          'socket': ['socket.io-client'],
          // HTTP client
          'axios': ['axios'],
          // Animation libraries
          'animation': ['framer-motion', 'gsap'],
          // UI utilities
          'ui-utils': ['lucide-react', 'react-icons'],
          // Form and validation
          'forms': ['react-hook-form'],
          // Date utilities
          'date': ['date-fns'],
          // Payment
          'payment': ['@stripe/stripe-js'],
        },
      },
    },
  },
})
