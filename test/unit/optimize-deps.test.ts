import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

// Vite resolves `a > b > c` by looking up each package from the directory of
// the previous one (nestedResolveBasedir). An entry that no longer resolves
// only surfaces as a Vite warning in consumers (Nuxt's NUXT_B7002), e.g. after
// @supabase/ssr drops `cookie` or postgrest-js stops being a separate package.
// This test makes such a dependency bump fail here instead.

const extendViteConfig = vi.fn()

vi.mock('@nuxt/kit', () => ({
  defineNuxtModule: <T>(definition: T) => definition,
  addPlugin: vi.fn(),
  addTypeTemplate: vi.fn(),
  addServerHandler: vi.fn(),
  extendViteConfig,
  addImportsDir: vi.fn(),
  createResolver: () => ({ resolve: (...paths: string[]) => paths.join('/') }),
}))

type PackageJson = {
  name: string
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
const readPackageJson = (dir: string) => JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as PackageJson

// Node's lookup through ancestor node_modules directories, like Vite's
// resolvePackageData (which follows symlinks into pnpm's store).
const findPackageDir = (name: string, basedir: string) => {
  for (let dir = basedir; ; dir = dirname(dir)) {
    const candidate = join(dir, 'node_modules', name)
    if (existsSync(join(candidate, 'package.json'))) {
      return realpathSync(candidate)
    }
    if (dirname(dir) === dir) {
      return undefined
    }
  }
}

const getOptimizeDepsInclude = async () => {
  const module = (await import('../../src/module')).default as unknown as {
    setup: (options: Record<string, unknown>, nuxt: unknown) => void
  }
  module.setup({ url: 'https://project.supabase.co', publishableKey: 'key', clientOptions: {} }, {
    options: { runtimeConfig: { public: {}, supabase: {} }, alias: {}, buildDir: '/build' },
    hook: vi.fn(),
  })
  const config: { optimizeDeps?: { include?: string[] } } = {}
  extendViteConfig.mock.calls[0]![0](config)
  return config.optimizeDeps?.include ?? []
}

describe('vite optimizeDeps.include entries', async () => {
  const entries = await getOptimizeDepsInclude()

  it('are all nested under this package', () => {
    expect(entries.length).toBeGreaterThan(0)
    for (const entry of entries) {
      expect(entry.split('>')[0]!.trim()).toBe(readPackageJson(repoRoot).name)
    }
  })

  it.each(entries)('%s resolves through declared dependencies', entry => {
    const [, ...chain] = entry.split('>').map(segment => segment.trim())
    let dir = repoRoot
    let path = readPackageJson(repoRoot).name

    for (const name of chain) {
      // Declared, not merely reachable: pnpm's hidden hoisting can make an
      // undeclared transitive package resolve by accident in one consumer and
      // not in another.
      const parent = readPackageJson(dir)
      const declared = {
        ...parent.dependencies,
        ...parent.optionalDependencies,
        ...parent.peerDependencies,
      }
      expect(declared, `${name} is not a dependency of ${path}`).toHaveProperty([name])

      const resolved = findPackageDir(name, dir)
      expect(resolved, `${name} is not installed for ${path}`).toBeDefined()
      dir = resolved!
      path = `${path} > ${name}`
    }
  })
})
