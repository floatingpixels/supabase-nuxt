import { defineVitestConfig } from '@nuxt/test-utils/config'
import { fileURLToPath } from 'node:url'

export default defineVitestConfig({
  test: {
    include: ['./test/**/*.spec.ts', './test/**/*.test.ts'],
    exclude: ['**/playwright/**'],
    environmentOptions: {
      nuxt: {
        rootDir: fileURLToPath(new URL('./playground', import.meta.url)),
        dotenv: {
          fileName: 'dev.env',
        },
      },
    },
  },
})
