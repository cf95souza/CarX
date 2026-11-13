import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const createApiProxy = (target = process.env.VITE_API_URL || 'http://localhost:3333') => ({
  target,
  changeOrigin: true,
  bypass: (req) => {
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return '/index.html';
    }
  },
});

// https://vitejs.dev/config/ - CarX Web Platform
export default defineConfig({
  define: {
    global: 'window',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/auth': createApiProxy(),
      '/work-orders': createApiProxy(),
      '/customers': createApiProxy(),
      '/vehicles': createApiProxy(),
      '/catalog': createApiProxy(),
      '/payments': createApiProxy(),
      '/stock': createApiProxy(),
      '/appointments': createApiProxy(),
      '/inspections': createApiProxy(),
      '/technician': createApiProxy(),
      '/qa': createApiProxy(),
      '/warranties': createApiProxy(),
      '/nps': createApiProxy(),
      '/commissions': createApiProxy(),
      '/financial': createApiProxy(),
      '/realtime': createApiProxy(),
      '/storage': createApiProxy(),
      '/tenant': createApiProxy(),
      '/plans': createApiProxy(),
      '/portal/auth': createApiProxy(),
      '/portal/me': createApiProxy(),
      '/portal/vehicles': createApiProxy(),
      '/portal/work-orders': createApiProxy(),
      '/portal/warranties': createApiProxy(),
      '/public': createApiProxy(),
      '/reports': createApiProxy(),
      '/integrations': createApiProxy(),
      '/customer-portal': createApiProxy(),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'CarX - Gestão Automotiva Inteligente',
        short_name: 'CarX',
        description: 'SaaS Automotivo com Pátio ao Vivo e Gestão Completa',
        theme_color: '#0E1116',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
