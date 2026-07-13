import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000, // 可自定义
  },
  resolve: {
    extensions: ['.js', '.ts', '.json']
  }
})