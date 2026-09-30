import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import { serwist } from "@serwist/vite"

export default defineConfig({
  plugins: [
    react(),
    serwist({
      swSrc: 'src/sw.ts',
      swDest: 'sw.js',
      globDirectory: 'dist',
      injectionPoint: 'self.__SW_MANIFEST',
      rollupFormat: 'iife'
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@centroabsen/shared": path.resolve(__dirname, "../../packages/shared/src")
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
})
