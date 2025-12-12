import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    preact(),
    tailwindcss(),
    // Serve WASM files from pkg folder
    {
      name: 'serve-wasm',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/pkg/')) {
            const filePath = resolve(__dirname, '../..', req.url.slice(1))
            try {
              const content = readFileSync(filePath)
              const ext = req.url.split('.').pop()
              const contentType = ext === 'wasm'
                ? 'application/wasm'
                : ext === 'js'
                ? 'application/javascript'
                : 'application/octet-stream'
              res.setHeader('Content-Type', contentType)
              res.end(content)
              return
            } catch (e) {
              // File not found, continue to next middleware
            }
          }
          next()
        })
      }
    }
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to the SpoolEase device
      '/api': {
        target: 'http://192.168.255.105',
        changeOrigin: true,
      },
      '/spools-catalog': {
        target: 'http://192.168.255.105',
        changeOrigin: true,
      },
      '/filament-brands': {
        target: 'http://192.168.255.105',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Output to bins folder for deployment
    outDir: '../../bins/0.5/inventory-new',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Keep file names simple for ESP embedding
        entryFileNames: 'inventory.js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
})
