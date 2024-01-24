/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    testTimeout: 10000,
    // environmentOptions: { nuxt: { domEnvironment: 'jsdom' } },
  },
})
