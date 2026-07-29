import type { H3Event } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useRuntimeConfig = vi.fn()
const createClient = vi.fn()
const createServerClient = vi.fn()
const parseCookies = vi.fn()
const setCookie = vi.fn()
const setResponseHeaders = vi.fn()
const getQuery = vi.fn()
const sendRedirect = vi.fn()
const createError = vi.fn((input: { statusCode?: number, statusMessage?: string, message?: string }) => {
  const error = new Error(input.message ?? input.statusMessage)
  Object.assign(error, input)
  return error
})

// Mirrors the cache-prevention headers @supabase/ssr documents for setAll.
const AUTH_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
  'Expires': '0',
  'Pragma': 'no-cache',
}
const supabaseServerClient = vi.fn()
const getResponseHeader = vi.fn()
const setResponseHeader = vi.fn()
const removeResponseHeader = vi.fn()

type EventWithContext = H3Event & {
  context: Record<string, unknown>
}

type RouteEvent = H3Event & {
  path: string
}

vi.mock('#imports', () => ({
  useRuntimeConfig,
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient,
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient,
}))

vi.mock('h3', () => ({
  defineEventHandler: <T>(handler: T) => handler,
  parseCookies,
  setCookie,
  setResponseHeaders,
  getResponseHeader,
  setResponseHeader,
  removeResponseHeader,
  getQuery,
  sendRedirect,
  createError,
}))

vi.mock('#supabase/server', () => ({
  supabaseServerClient,
}))

describe('server runtime', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('memoizes the request-scoped supabase server client and forwards cookie helpers', async () => {
    const client = { kind: 'server-client' }
    const event = { context: {} } as unknown as EventWithContext
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
    parseCookies.mockReturnValue({
      sb: 'cookie-value',
    })
    createServerClient.mockReturnValue(client)

    const { supabaseServerClient: getClient } = await import('../../src/runtime/server/services/supabaseServerClient')
    const first = await getClient(event)
    const second = await getClient(event)

    expect(first).toBe(client)
    expect(second).toBe(client)
    expect(useRuntimeConfig).toHaveBeenCalledWith(event)
    expect(createServerClient).toHaveBeenCalledTimes(1)

    const options = createServerClient.mock.calls[0]![2]
    expect(options.auth).toEqual({ persistSession: false })
    expect(options.cookies.getAll()).toEqual([{ name: 'sb', value: 'cookie-value' }])
    options.cookies.setAll(
      [{ name: 'sb-next', value: 'next', options: { secure: true } }],
      { 'Cache-Control': 'private, no-store' },
    )
    expect(setCookie).toHaveBeenCalledWith(event, 'sb-next', 'next', { secure: true })
    expect(setResponseHeaders).toHaveBeenCalledWith(event, { 'Cache-Control': 'private, no-store' })
  })

  it('creates a cookie-free service role client and throws when the key is missing', async () => {
    const event = { context: {} } as unknown as EventWithContext
    useRuntimeConfig.mockReturnValueOnce({
      supabase: {
        serviceRoleKey: undefined,
      },
      public: {
        supabase: {
          url: 'https://project.supabase.co',
          clientOptions: {},
        },
      },
    })

    const { supabaseServiceRole } = await import('../../src/runtime/server/services/supabaseServiceRole')
    await expect(supabaseServiceRole(event)).rejects.toThrow('Missing `NUXT_SUPABASE_SERVICE_ROLE_KEY` in `.env`')
    expect(useRuntimeConfig).toHaveBeenCalledWith(event)

    const serviceClient = { kind: 'service-role-client' }
    useRuntimeConfig.mockReturnValue({
      supabase: {
        serviceRoleKey: 'service-role-key',
      },
      public: {
        supabase: {
          url: 'https://project.supabase.co',
          clientOptions: {
            global: {
              headers: {
                Authorization: 'Bearer test',
              },
            },
          },
        },
      },
    })
    parseCookies.mockReturnValue({
      sb: 'signed-in-user-session',
    })
    createClient.mockReturnValue(serviceClient)

    const first = await supabaseServiceRole(event)
    const second = await supabaseServiceRole(event)

    expect(first).toBe(serviceClient)
    expect(second).toBe(serviceClient)
    expect(createClient).toHaveBeenCalledTimes(1)
    expect(createClient).toHaveBeenCalledWith(
      'https://project.supabase.co',
      'service-role-key',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    )
    expect(createServerClient).not.toHaveBeenCalled()
    expect(parseCookies).not.toHaveBeenCalled()
    expect(setCookie).not.toHaveBeenCalled()
    expect(setResponseHeaders).not.toHaveBeenCalled()
  })

  it('keeps service role PostgREST and auth admin calls independent from user cookies', async () => {
    const select = vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null })
    const from = vi.fn().mockReturnValue({ select })
    const listUsers = vi.fn().mockResolvedValue({ data: { users: [] }, error: null })
    const serviceClient = {
      from,
      auth: {
        admin: {
          listUsers,
        },
      },
    }
    const event = {
      context: {},
    } as unknown as EventWithContext
    useRuntimeConfig.mockReturnValue({
      supabase: {
        serviceRoleKey: 'service-role-key',
      },
      public: {
        supabase: {
          url: 'https://project.supabase.co',
          clientOptions: {
            global: {
              headers: {
                Authorization: 'Bearer signed-in-user-token',
              },
            },
          },
        },
      },
    })
    parseCookies.mockReturnValue({
      sb: 'signed-in-user-session',
    })
    createClient.mockReturnValue(serviceClient)

    const { supabaseServiceRole } = await import('../../src/runtime/server/services/supabaseServiceRole')
    const client = await supabaseServiceRole(event)

    await client.from('service_only_check').select('id')
    await client.auth.admin.listUsers()

    expect(from).toHaveBeenCalledWith('service_only_check')
    expect(select).toHaveBeenCalledWith('id')
    expect(listUsers).toHaveBeenCalledTimes(1)
    expect(createClient.mock.calls[0]![2]).not.toHaveProperty('global.headers.Authorization')
    expect(parseCookies).not.toHaveBeenCalled()
    expect(setCookie).not.toHaveBeenCalled()
  })

  it('handles callback auth errors and success redirects', async () => {
    const event = { path: '/auth/callback' } as unknown as RouteEvent
    const exchangeCodeForSession = vi.fn()
    supabaseServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession,
      },
    })

    const callbackHandler = (await import('../../src/runtime/server/auth/callback')).default

    getQuery.mockReturnValue({})
    await expect(callbackHandler(event)).rejects.toThrow('No code provided')
    expect(createError).toHaveBeenCalledWith({ statusCode: 400, message: 'No code provided' })

    getQuery.mockReturnValue({
      code: 'oauth-code',
      redirect_to: '/dashboard',
    })
    exchangeCodeForSession.mockResolvedValueOnce({
      error: { message: 'exchange failed', status: 403 },
    })
    await expect(callbackHandler(event)).rejects.toThrow('exchange failed')
    expect(createError).toHaveBeenCalledWith({ statusCode: 403, message: 'exchange failed' })

    // Auth errors without an HTTP status still map to a client error.
    exchangeCodeForSession.mockResolvedValueOnce({
      error: { message: 'exchange failed' },
    })
    await expect(callbackHandler(event)).rejects.toThrow('exchange failed')
    expect(createError).toHaveBeenCalledWith({ statusCode: 400, message: 'exchange failed' })

    exchangeCodeForSession.mockResolvedValueOnce({
      error: null,
    })
    await callbackHandler(event)

    expect(exchangeCodeForSession).toHaveBeenCalledWith('oauth-code')
    expect(sendRedirect).toHaveBeenCalledWith(event, '/dashboard', 302)
    expect(setResponseHeaders).toHaveBeenCalledWith(event, AUTH_NO_STORE_HEADERS)
  })

  it('rejects unsafe callback redirect targets before exchanging the code', async () => {
    const event = { path: '/auth/callback' } as unknown as RouteEvent
    const exchangeCodeForSession = vi.fn()
    supabaseServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession,
      },
    })

    const callbackHandler = (await import('../../src/runtime/server/auth/callback')).default

    for (const redirect_to of ['https://example.com/dashboard', '//example.com/dashboard', '/\\example.com', '/%2fexample.com', '/%2Fexample.com', '/\t/evil.com', '/a\u007Fb']) {
      getQuery.mockReturnValue({
        code: 'oauth-code',
        redirect_to,
      })

      await expect(callbackHandler(event)).rejects.toThrow('Invalid redirect_to')
    }

    expect(supabaseServerClient).not.toHaveBeenCalled()
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
    expect(setResponseHeaders).toHaveBeenCalledWith(event, AUTH_NO_STORE_HEADERS)
  })

  it('handles confirm auth validation, verification errors, and success redirects', async () => {
    const event = { path: '/auth/confirm' } as unknown as RouteEvent
    const verifyOtp = vi.fn()
    supabaseServerClient.mockResolvedValue({
      auth: {
        verifyOtp,
      },
    })

    const confirmHandler = (await import('../../src/runtime/server/auth/confirm')).default

    getQuery.mockReturnValue({
      token_hash: 'token-only',
    })
    await expect(confirmHandler(event)).rejects.toThrow('Invalid token')
    expect(createError).toHaveBeenCalledWith({ statusCode: 400, message: 'Invalid token' })

    getQuery.mockReturnValue({
      token_hash: 'token-hash',
      type: 'magiclink',
      redirect_to: '/welcome',
    })
    verifyOtp.mockResolvedValueOnce({
      error: { message: 'verify failed', status: 401 },
    })
    await expect(confirmHandler(event)).rejects.toThrow('verify failed')
    expect(createError).toHaveBeenCalledWith({ statusCode: 401, message: 'verify failed' })

    verifyOtp.mockResolvedValueOnce({
      error: null,
    })
    await confirmHandler(event)

    expect(verifyOtp).toHaveBeenCalledWith({
      type: 'magiclink',
      token_hash: 'token-hash',
    })
    expect(sendRedirect).toHaveBeenCalledWith(event, '/welcome', 302)
    expect(setResponseHeaders).toHaveBeenCalledWith(event, AUTH_NO_STORE_HEADERS)
  })

  it('rejects unsafe confirm redirect targets before verifying the token', async () => {
    const event = { path: '/auth/confirm' } as unknown as RouteEvent
    const verifyOtp = vi.fn()
    supabaseServerClient.mockResolvedValue({
      auth: {
        verifyOtp,
      },
    })

    const confirmHandler = (await import('../../src/runtime/server/auth/confirm')).default

    for (const redirect_to of ['https://example.com/welcome', '//example.com/welcome', '/\\example.com', '/%5cexample.com', '/%5Cexample.com', '/\t/evil.com', '/a\u007Fb']) {
      getQuery.mockReturnValue({
        token_hash: 'token-hash',
        type: 'magiclink',
        redirect_to,
      })

      await expect(confirmHandler(event)).rejects.toThrow('Invalid redirect_to')
    }

    expect(supabaseServerClient).not.toHaveBeenCalled()
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(setResponseHeaders).toHaveBeenCalledWith(event, AUTH_NO_STORE_HEADERS)
  })
})
