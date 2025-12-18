import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'
import { fileURLToPath } from 'node:url'
const r = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// Workaround to provide a stub for 'bun:test' module used in @nuxt/test-utils
const bunTestStub = r('./test/stubs/bun-test.ts')
const bunStubConfig = {
  // Provide a stub so Vite can resolve the optional Bun runner import inside @nuxt/test-utils.
  resolve: {
    alias: {
      'bun:test': bunTestStub,
    },
  },
}
// end bun:test stub

export default defineConfig({
  ...bunStubConfig,
  test: {
    projects: [
      {
        ...bunStubConfig,
        test: {
          name: 'unit',
          include: ['test/{e2e,unit}/*.{test,spec}.ts'],
          exclude: ['**/playwright/**'],
          environment: 'node',
        },
      },
      await defineVitestProject({
        ...bunStubConfig,
        test: {
          name: 'nuxt',
          include: ['test/nuxt/*.{test,spec}.ts'],
          environment: 'nuxt',
          environmentOptions: {
            nuxt: {
              rootDir: r('./playground'),
              dotenv: {
                fileName: 'dev.env',
              },
            },
          },
        },
      }),
    ],
  },
})
