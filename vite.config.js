import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/ERPControl/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://quick.glcpaints.com:7003',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('SP_Name', 'APIERPControlOperation')
            proxyReq.setHeader('Accept', 'application/json')
            proxyReq.setHeader('Content-Type', 'application/json')
          })
        }
      }
    }
  }
})
