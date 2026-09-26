import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: fileURLToPath(new URL('../../packages/sdk/dist', import.meta.url)),
  server: {
    host: 'localhost',
    port: 4173,
    strictPort: true,
  },
  preview: {
    host: 'localhost',
    port: 4173,
    strictPort: true,
  },
})
