import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 운영에서는 nginx가 /api/ → backend:23001/ 로 프록시한다(경로에서 /api 제거).
    // dev에서도 같은 형태로 맞춰야 /stats 호출이 로컬 백엔드에 닿는다.
    // 이 프록시가 없으면 fetch가 dev 서버의 404를 받고, fetch는 reject하지 않으므로
    // 에러 로그도 없이 조용히 집계가 누락된다.
    proxy: {
      '/api': {
        target: 'http://localhost:23001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
