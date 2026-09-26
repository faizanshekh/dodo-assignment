import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'CheckoutSDK',
      formats: ['iife'],
      fileName: () => 'checkout-sdk.js',
    },
  },
})
