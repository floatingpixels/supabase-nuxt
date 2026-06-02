import type { H3Event } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useRuntimeConfig = vi.fn()
const createServerClient = vi.fn()
const parseCookies = vi.fn()
const setCookie = vi.fn()
const setResponseHeaders = vi.fn()
const getQuery = vi.fn()
const sendRedirect = vi.fn()
const createError = vi.fn((input: { statusMessage: string }) => {
  const error = new Error(input.statusMessage)
  Object.assign(error, input)
  return error
})
const supabaseServerClient = vi.fn()

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

vi.mock('h3', () => ({
  defineEventHandler: <T>(handler: T) => handler,
  parseCookies,
  setCookie,
  setResponseHeaders,
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

  it('memoizes the service role client and throws when the key is missing', async () => {
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
    await expect(supabaseServiceRole(event)).rejects.toThrow('Missing `SUPABASE_SERVICE_ROLE_KEY` in `.env`')
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
    createServerClient.mockReturnValue(serviceClient)

    const first = await supabaseServiceRole(event)
    const second = await supabaseServiceRole(event)

    expect(first).toBe(serviceClient)
    expect(second).toBe(serviceClient)
    expect(createServerClient).toHaveBeenCalledTimes(1)
    expect(createServerClient.mock.calls[0]![1]).toBe('service-role-key')
    expect(createServerClient.mock.calls[0]![2].global).toEqual({
      headers: {
        Authorization: 'Bearer test',
      },
    })
    createServerClient.mock.calls[0]![2].cookies.setAll(
      [{ name: 'sb-service', value: 'service', options: { httpOnly: true } }],
      { Pragma: 'no-cache' },
    )
    expect(setCookie).toHaveBeenCalledWith(event, 'sb-service', 'service', { httpOnly: true })
    expect(setResponseHeaders).toHaveBeenCalledWith(event, { Pragma: 'no-cache' })
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

    getQuery.mockReturnValue({
      code: 'oauth-code',
      redirect_to: '/dashboard',
    })
    exchangeCodeForSession.mockResolvedValueOnce({
      error: { message: 'exchange failed' },
    })
    await expect(callbackHandler(event)).rejects.toThrow('exchange failed')

    exchangeCodeForSession.mockResolvedValueOnce({
      error: null,
    })
    await callbackHandler(event)

    expect(exchangeCodeForSession).toHaveBeenCalledWith('oauth-code')
    expect(sendRedirect).toHaveBeenCalledWith(event, '/dashboard', 302)
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

    getQuery.mockReturnValue({
      token_hash: 'token-hash',
      type: 'magiclink',
      redirect_to: '/welcome',
    })
    verifyOtp.mockResolvedValueOnce({
      error: { message: 'verify failed' },
    })
    await expect(confirmHandler(event)).rejects.toThrow('verify failed')

    verifyOtp.mockResolvedValueOnce({
      error: null,
    })
    await confirmHandler(event)

    expect(verifyOtp).toHaveBeenCalledWith({
      type: 'magiclink',
      token_hash: 'token-hash',
    })
    expect(sendRedirect).toHaveBeenCalledWith(event, '/welcome', 302)
  })
})
