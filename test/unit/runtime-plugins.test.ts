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

describe('runtime plugins', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
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

  it('creates the server client with cookies and configured clientOptions', async () => {
    const event = { context: {} }
    const serverClient = { kind: 'server-client' }
    useRuntimeConfig.mockReturnValue({
      public: {
        supabase: {
          url: 'https://project.supabase.co',
          publishableKey: 'publishable-key',
          clientOptions: {
            auth: {
              persistSession: false,
            },
            global: {
              headers: {
                'x-test': '1',
              },
            },
          },
        },
      },
    })
    useRequestEvent.mockReturnValue(event)
    parseCookies.mockReturnValue({
      sb: 'cookie-value',
    })
    createServerClient.mockReturnValue(serverClient)

    const plugin = (await import('../../src/runtime/plugins/supabase.server')).default as unknown as PluginWithSetup<{
      provide: {
        supabase: {
          client: unknown
        }
      }
    }>
    const result = await plugin.setup()

    expect(createServerClient).toHaveBeenCalledTimes(1)
    const options = createServerClient.mock.calls[0]![2]
    expect(options.auth).toEqual({ persistSession: false })
    expect(options.global).toEqual({
      headers: {
        'x-test': '1',
      },
    })
    expect(options.cookies.getAll()).toEqual([{ name: 'sb', value: 'cookie-value' }])
    options.cookies.setAll(
      [{ name: 'next-cookie', value: 'next-value', options: { httpOnly: true } }],
      { 'Cache-Control': 'private, no-store' },
    )
    expect(setCookie).toHaveBeenCalledWith(event, 'next-cookie', 'next-value', { httpOnly: true })
    expect(setResponseHeaders).toHaveBeenCalledWith(event, { 'Cache-Control': 'private, no-store' })
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
    await middleware({ path: '/private' })

    expect(navigateTo).toHaveBeenCalledWith('/sign-in', { redirectCode: 302 })
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

    await middleware({ path: '/public/docs' })
    await middleware({ path: '/sign-in' })
    await middleware({ path: '/private' })

    expect(navigateTo).not.toHaveBeenCalled()
  })
})
