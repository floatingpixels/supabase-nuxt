import { defineVitestConfig } from '@nuxt/test-utils/config'
import { fileURLToPath } from 'node:url'

export default defineVitestConfig({
  test: {
    include: ['./test/**/*.spec.ts', './test/**/*.test.ts'],
    exclude: ['**/playwright/**'],
    coverage: {
      exclude: ['**/.nuxt/**', '**/.output/**', '**/node_modules/**', '**/types/**', 'nuxt.config.ts'],
    },
    environmentOptions: {
      nuxt: {
        rootDir: fileURLToPath(new URL('./playground', import.meta.url)),
        dotenv: {
          fileName: '.env',
        },
      },
    },
  },
})
