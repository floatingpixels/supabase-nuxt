import { beforeEach, describe, expect, it, vi } from 'vitest'

const defineNuxtPlugin = <T>(plugin: T) => plugin
const defineNuxtRouteMiddleware = <T>(middleware: T) => middleware
const useRuntimeConfig = vi.fn()
const useRequestEvent = vi.fn()
const addRouteMiddleware = vi.fn()
const navigateTo = vi.fn()
const createBrowserClient = vi.fn()
const createServerClient = vi.fn()
const parseCookies = vi.fn()
const setCookie = vi.fn()
const setResponseHeaders = vi.fn()
const useSupabaseUser = vi.fn()
const useError = vi.fn()
const supabaseServerClient = vi.fn()

type PluginWithSetup<T> = {
  setup: () => Promise<T>
}

type PluginWithoutReturn = {
  setup: () => void
}

vi.mock('nuxt/app', () => ({
  defineNuxtPlugin,
  useRuntimeConfig,
  useRequestEvent,
}))

vi.mock('#imports', () => ({
  defineNuxtPlugin,
  addRouteMiddleware,
  defineNuxtRouteMiddleware,
  useRuntimeConfig,
  useError,
  navigateTo,
}))

vi.mock('@supabase/ssr', () => ({
  createBrowserClient,
  createServerClient,
}))

vi.mock('h3', () => ({
  parseCookies,
  setCookie,
  setResponseHeaders,
}))

vi.mock('../../src/runtime/composables/useSupabaseUser', () => ({
  useSupabaseUser,
}))

vi.mock('#supabase/server', () => ({
  supabaseServerClient,
}))

describe('runtime plugins', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    useError.mockReturnValue({ value: null })
  })

  it('creates the browser client with configured clientOptions', async () => {
    const browserClient = { kind: 'browser-client' }
    useRuntimeConfig.mockReturnValue({
      public: {
        supabase: {
          url: 'https://project.supabase.co',
          publishableKey: 'publishable-key',
          clientOptions: {
            auth: {
              persistSession: false,
            },
          },
        },
      },
    })
    createBrowserClient.mockReturnValue(browserClient)

    const plugin = (await import('../../src/runtime/plugins/supabase.client')).default as unknown as PluginWithSetup<{
      provide: {
        supabase: {
          client: unknown
        }
      }
    }>
    const result = await plugin.setup()

    expect(createBrowserClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'publishable-key',
      {
        auth: {
          persistSession: false,
        },
      },
    )
    expect(result).toEqual({
      provide: {
        supabase: {
          client: browserClient,
        },
      },
    })
  })

  it('serves the server plugin from the same request-scoped client as supabaseServerClient', async () => {
    const event = { context: {} }
    const serverClient = { kind: 'server-client' }
    useRequestEvent.mockReturnValue(event)
    supabaseServerClient.mockResolvedValue(serverClient)

    const plugin = (await import('../../src/runtime/plugins/supabase.server')).default as unknown as PluginWithSetup<{
      provide: {
        supabase: {
          client: unknown
        }
      }
    }>
    const result = await plugin.setup()

    // The plugin delegates instead of building its own client, so SSR and
    // server routes share one auth storage and one cookie adapter. Two clients
    // would each hold their own storage and could rotate the same refresh
    // token concurrently, losing one of the two rotations.
    expect(supabaseServerClient).toHaveBeenCalledWith(event)
    expect(createServerClient).not.toHaveBeenCalled()
    expect(result).toEqual({
      provide: {
        supabase: {
          client: serverClient,
        },
      },
    })
  })

  it('throws if the server plugin runs without a request event', async () => {
    useRuntimeConfig.mockReturnValue({
      public: {
        supabase: {
          url: 'https://project.supabase.co',
          publishableKey: 'publishable-key',
          clientOptions: {},
        },
      },
    })
    useRequestEvent.mockReturnValue(undefined)

    const plugin = (await import('../../src/runtime/plugins/supabase.server')).default as unknown as PluginWithSetup<unknown>

    await expect(plugin.setup()).rejects.toThrow('No request event found')
  })

  it('redirects unauthenticated users to the configured login route', async () => {
    useRuntimeConfig.mockReturnValue({
      public: {
        supabase: {
          redirectOptions: {
            login: '/sign-in',
            exclude: ['/public/*'],
          },
        },
      },
    })
    useSupabaseUser.mockResolvedValue({
      data: null,
      error: null,
    })

    const plugin = (await import('../../src/runtime/plugins/middleware-auth-redirect')).default as unknown as PluginWithoutReturn
    plugin.setup()

    expect(addRouteMiddleware).toHaveBeenCalledTimes(1)
    const middleware = addRouteMiddleware.mock.calls[0]![1]
    await middleware({ path: '/private', fullPath: '/private?tab=2' })

    // The intended destination travels along so the login page can return
    // the user after sign-in.
    expect(navigateTo).toHaveBeenCalledWith(
      { path: '/sign-in', query: { redirect_to: '/private?tab=2' } },
      { redirectCode: 302 },
    )
  })

  it('does not redirect while the error page is rendering', async () => {
    useRuntimeConfig.mockReturnValue({
      public: {
        supabase: {
          redirectOptions: {
            login: '/sign-in',
            exclude: [],
          },
        },
      },
    })
    // The error page renders through the app; hijacking it into a login
    // redirect would replace e.g. a 400 from /auth/confirm with a 302.
    useError.mockReturnValue({ value: { statusCode: 400 } })

    const plugin = (await import('../../src/runtime/plugins/middleware-auth-redirect')).default as unknown as PluginWithoutReturn
    plugin.setup()
    const middleware = addRouteMiddleware.mock.calls[0]![1]

    await middleware({ path: '/auth/confirm', fullPath: '/auth/confirm?token_hash=x&type=email' })

    expect(useSupabaseUser).not.toHaveBeenCalled()
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('treats exclude patterns as literals apart from the * wildcard', async () => {
    useRuntimeConfig.mockReturnValue({
      public: {
        supabase: {
          redirectOptions: {
            login: '/sign-in',
            exclude: ['/metrics+live', '/admin.old'],
          },
        },
      },
    })
    useSupabaseUser.mockResolvedValue({
      data: null,
      error: null,
    })

    const plugin = (await import('../../src/runtime/plugins/middleware-auth-redirect')).default as unknown as PluginWithoutReturn
    plugin.setup()
    const middleware = addRouteMiddleware.mock.calls[0]![1]

    // Exact literal matches are excluded, even with regex metacharacters.
    await middleware({ path: '/metrics+live', fullPath: '/metrics+live' })
    await middleware({ path: '/admin.old', fullPath: '/admin.old' })
    expect(navigateTo).not.toHaveBeenCalled()

    // Paths that only match when metacharacters are interpreted are not.
    await middleware({ path: '/metricslive', fullPath: '/metricslive' })
    await middleware({ path: '/adminXold', fullPath: '/adminXold' })
    expect(navigateTo).toHaveBeenCalledTimes(2)
  })

  it('skips redirects for excluded paths and authenticated users', async () => {
    useRuntimeConfig.mockReturnValue({
      public: {
        supabase: {
          redirectOptions: {
            login: '/sign-in',
            exclude: ['/public/*', '/health'],
          },
        },
      },
    })
    useSupabaseUser.mockResolvedValue({
      data: { id: 'user-1' },
      error: null,
    })

    const plugin = (await import('../../src/runtime/plugins/middleware-auth-redirect')).default as unknown as PluginWithoutReturn
    plugin.setup()
    const middleware = addRouteMiddleware.mock.calls[0]![1]

    await middleware({ path: '/public/docs', fullPath: '/public/docs' })
    await middleware({ path: '/sign-in', fullPath: '/sign-in' })
    await middleware({ path: '/private', fullPath: '/private' })

    expect(navigateTo).not.toHaveBeenCalled()
  })
})
