import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Served from GitHub Pages at https://alex-roc.github.io/align-sprites/
export default defineConfig({
  base: '/align-sprites/',
  plugins: [react()],
  worker: { format: 'es' },
})
