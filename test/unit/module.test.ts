import { beforeEach, describe, expect, it, vi } from 'vitest'

const addPlugin = vi.fn()
const addTypeTemplate = vi.fn()
const addServerHandler = vi.fn()
const extendViteConfig = vi.fn()
const addImportsDir = vi.fn()

type HookCallback = (arg: unknown) => void

type TestModule = {
  setup: (options: Record<string, unknown>, nuxt: TestNuxt) => Promise<void> | void
}

type TestNuxt = {
  options: {
    runtimeConfig: {
      public: Record<string, unknown>
      supabase: Record<string, unknown>
    }
    alias: Record<string, string>
    buildDir: string
    dev?: boolean
  }
  hook: (name: string, callback: HookCallback) => void
}

vi.mock('@nuxt/kit', () => ({
  defineNuxtModule: <T>(definition: T) => definition,
  addPlugin,
  addTypeTemplate,
  addServerHandler,
  extendViteConfig,
  addImportsDir,
  createResolver: () => ({
    resolve: (...paths: string[]) => `/resolved${paths.map(path => path.replace(/^\./, '')).join('/')}`,
  }),
}))

describe('module contract', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('registers runtime config, plugins, handlers, aliases, types, and vite deps', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const module = (await import('../../src/module')).default as unknown as TestModule
    const hooks: Record<string, HookCallback> = {}
    const nuxt: TestNuxt = {
      options: {
        runtimeConfig: {
          public: {},
          supabase: {},
        },
        alias: {
          '#existing': '/existing',
        },
        buildDir: '/build',
      },
      hook: vi.fn((name: string, callback: HookCallback) => {
        hooks[name] = callback
      }),
    }

    await module.setup({
      url: 'https://project.supabase.co',
      publishableKey: 'publishable-key',
      secretKey: 'service-role-key',
      redirect: true,
      redirectOptions: {
        login: '/sign-in',
        exclude: ['/public/*'],
      },
      clientOptions: {
        auth: {
          persistSession: false,
        },
      },
    }, nuxt)

    expect(warnSpy).not.toHaveBeenCalled()
    expect(nuxt.options.runtimeConfig.public.supabase).toEqual({
      url: 'https://project.supabase.co',
      publishableKey: 'publishable-key',
      redirect: true,
      redirectOptions: {
        login: '/sign-in',
        exclude: ['/public/*'],
      },
      clientOptions: {
        auth: {
          persistSession: false,
        },
      },
    })
    expect(nuxt.options.runtimeConfig.supabase).toEqual({
      serviceRoleKey: 'service-role-key',
    })
    expect(nuxt.options.alias).toEqual({
      '#existing': '/existing',
      '#supabase/server': '/resolved/runtime/server/services',
    })

    expect(addPlugin).toHaveBeenCalledTimes(3)
    expect(addPlugin).toHaveBeenNthCalledWith(1, '/resolved/runtime/plugins/supabase.server')
    expect(addPlugin).toHaveBeenNthCalledWith(2, '/resolved/runtime/plugins/supabase.client')
    expect(addPlugin).toHaveBeenNthCalledWith(3, '/resolved/runtime/plugins/middleware-auth-redirect')

    expect(addServerHandler).toHaveBeenCalledTimes(2)
    expect(addServerHandler).toHaveBeenNthCalledWith(1, {
      route: '/auth/confirm',
      handler: '/resolved/runtime/server/auth/confirm',
      method: 'get',
    })
    expect(addServerHandler).toHaveBeenNthCalledWith(2, {
      route: '/auth/callback',
      handler: '/resolved/runtime/server/auth/callback',
      method: 'get',
    })

    expect(hooks['nitro:config']).toBeTypeOf('function')
    expect(hooks['prepare:types']).toBeTypeOf('function')
    expect(addImportsDir).toHaveBeenCalledWith('/resolved/runtime/composables')

    const nitroConfig = {
      alias: {
        '#nitro-existing': '/nitro-existing',
      },
      externals: {
        inline: ['/already-inline'],
      },
    }
    hooks['nitro:config']!(nitroConfig)
    expect(nitroConfig).toEqual({
      alias: {
        '#nitro-existing': '/nitro-existing',
        '#supabase/server': '/resolved/runtime/server/services',
      },
      externals: {
        inline: ['/already-inline', '/resolved/runtime'],
      },
    })

    expect(addTypeTemplate).toHaveBeenCalledTimes(1)
    const typeTemplate = addTypeTemplate.mock.calls[0]![0]
    expect(typeTemplate.filename).toBe('types/supabase.d.ts')
    expect(typeTemplate.getContents()).toContain("declare module '#supabase/server'")
    expect(typeTemplate.getContents()).toContain('/resolved/runtime/server/services')

    const typeOptions = { references: [] as Array<{ path: string }> }
    hooks['prepare:types']!(typeOptions)
    expect(typeOptions.references).toEqual([{ path: '/resolved/build/types/supabase.d.ts' }])

    expect(extendViteConfig).toHaveBeenCalledTimes(1)
    const viteConfig = {
      optimizeDeps: {
        include: ['existing-dep'],
      },
    }
    extendViteConfig.mock.calls[0]![0](viteConfig)
    expect(viteConfig.optimizeDeps.include).toEqual([
      'existing-dep',
      '@floatingpixels/supabase-nuxt > @supabase/postgrest-js',
      '@floatingpixels/supabase-nuxt > @supabase/ssr > cookie',
      '@floatingpixels/supabase-nuxt > @supabase/supabase-js',
    ])
  })

  it('warns in dev when public credentials are missing and skips redirect plugin when disabled', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const module = (await import('../../src/module')).default as unknown as TestModule
    const hooks: Record<string, HookCallback> = {}
    const nuxt: TestNuxt = {
      options: {
        runtimeConfig: {
          public: {},
          supabase: {},
        },
        alias: {},
        buildDir: '/build',
        dev: true,
      },
      hook: vi.fn((name: string, callback: HookCallback) => {
        hooks[name] = callback
      }),
    }

    delete process.env.NUXT_PUBLIC_SUPABASE_URL
    delete process.env.NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    await module.setup({
      redirect: false,
      redirectOptions: {
        login: '/login',
        exclude: [],
      },
      clientOptions: {
        auth: {
          persistSession: true,
        },
      },
    }, nuxt)

    expect(warnSpy).toHaveBeenCalledTimes(2)
    expect(addPlugin).toHaveBeenCalledTimes(2)
    expect(addPlugin).not.toHaveBeenCalledWith('/resolved/runtime/plugins/middleware-auth-redirect')
    expect(hooks['nitro:config']).toBeTypeOf('function')

    // Production builds routinely receive credentials via NUXT_* env vars at
    // runtime, so the same setup outside dev stays silent.
    warnSpy.mockClear()
    nuxt.options.dev = false
    await module.setup({
      redirect: false,
      redirectOptions: { login: '/login', exclude: [] },
      clientOptions: {},
    }, nuxt)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('extends existing runtime config instead of replacing it', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const module = (await import('../../src/module')).default as unknown as TestModule
    const nuxt: TestNuxt = {
      options: {
        runtimeConfig: {
          public: {
            supabase: {
              url: 'https://runtime.supabase.co',
              redirectOptions: {
                exclude: ['/health'],
              },
              clientOptions: {
                auth: {
                  autoRefreshToken: false,
                  experimental: {
                    passkey: true,
                  },
                },
              },
            },
          },
          supabase: {
            serviceRoleKey: 'runtime-service-role-key',
          },
        },
        alias: {},
        buildDir: '/build',
      },
      hook: vi.fn(),
    }

    await module.setup({
      url: 'https://option.supabase.co',
      publishableKey: 'publishable-key',
      secretKey: 'option-service-role-key',
      redirect: true,
      redirectOptions: {
        login: '/sign-in',
        exclude: ['/public/*'],
      },
      clientOptions: {
        auth: {
          persistSession: false,
        },
      },
    }, nuxt)

    expect(warnSpy).not.toHaveBeenCalled()
    expect(nuxt.options.runtimeConfig.public.supabase).toEqual({
      url: 'https://runtime.supabase.co',
      publishableKey: 'publishable-key',
      redirect: true,
      redirectOptions: {
        login: '/sign-in',
        exclude: ['/health', '/public/*'],
      },
      clientOptions: {
        auth: {
          autoRefreshToken: false,
          experimental: {
            passkey: true,
          },
          persistSession: false,
        },
      },
    })
    expect(nuxt.options.runtimeConfig.supabase).toEqual({
      serviceRoleKey: 'runtime-service-role-key',
    })
  })
})
