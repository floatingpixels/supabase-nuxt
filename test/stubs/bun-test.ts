// Minimal stub so Vite/Vitest can resolve the Bun test module when bundling @nuxt/test-utils.
export const mock = () => {
  throw new Error('bun:test mock stub invoked in non-Bun environment')
}

export const beforeAll = () => {}
export const beforeEach = () => {}
export const afterEach = () => {}
export const afterAll = () => {}
