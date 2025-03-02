import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/planet-vlad/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 5174
  }
})
