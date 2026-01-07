// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,          // 0.0.0.0 바인딩 → 휴대폰 접근 가능
    port: 5173,
    hmr: { host: '192.168.0.52' } // 예: '192.168.0.12'
  },
  preview: {
    host: true,
    port: 4173
  },
  // 빌드 후 다른 경로에서 띄울 계획이면 다음도 추가
  // base: './'
})
