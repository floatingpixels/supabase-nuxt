import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { createEvent } from 'h3'
import type { H3Event } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useRuntimeConfig = vi.fn()
const createServerClient = vi.fn()
const supabaseServerClient = vi.fn()

vi.mock('#imports', () => ({
  useRuntimeConfig,
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient,
}))

vi.mock('#supabase/server', () => ({
  supabaseServerClient,
}))

const SESSION_COOKIES = [
  { name: 'sb-api-auth-token.0', value: 'base64-chunk-zero', options: { path: '/' } },
  { name: 'sb-api-auth-token.1', value: 'chunk-one', options: { path: '/' } },
]

type ServerCookieMethods = {
  setAll: (cookiesToSet: typeof SESSION_COOKIES, headers?: Record<string, string>) => void
}

const createTestEvent = (url: string) => {
  const req = new IncomingMessage(new Socket())
  req.method = 'GET'
  req.url = url
  const res = new ServerResponse(req)
  return { event: createEvent(req, res), res }
}

// The real cookie adapter for `event`, captured from the `cookies` option the
// service passes to the mocked createServerClient.
const cookieAdapterFor = async (event: H3Event): Promise<ServerCookieMethods> => {
  const { supabaseServerClient: getClient } = await import('../../src/runtime/server/services/supabaseServerClient')
  await getClient(event)
  const options = createServerClient.mock.calls.at(-1)![2] as { cookies: ServerCookieMethods }
  return options.cookies
}

/**
 * A Supabase client stand-in whose auth call persists the session through the
 * real cookie adapter, exactly as @supabase/ssr does from its
 * onAuthStateChange subscriber.
 *
 * With `commitDuringCall` the response is committed while the auth call is in
 * flight, reproducing the production failure: the refresh finishes after the
 * response has gone out, so its cookies can no longer be attached.
 */
const clientPersistingThrough = async (
  event: H3Event,
  { commitDuringCall = false } = {},
) => {
  const cookies = await cookieAdapterFor(event)
  const persist = () => {
    if (commitDuringCall) {
      event.node.res.writeHead(200)
    }
    cookies.setAll(SESSION_COOKIES, { 'Cache-Control': 'private, no-store' })
    return { error: null }
  }
  return {
    auth: {
      exchangeCodeForSession: vi.fn(async () => persist()),
      verifyOtp: vi.fn(async () => persist()),
    },
  }
}

describe('auth flows when session cookies cannot be persisted', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    useRuntimeConfig.mockReturnValue({
      public: {
        supabase: {
          url: 'https://project.supabase.co',
          publishableKey: 'publishable-key',
          clientOptions: {},
        },
      },
    })
    createServerClient.mockReturnValue({ kind: 'server-client' })
  })

  it('does not redirect the OAuth callback as authenticated', async () => {
    const { event } = createTestEvent('/auth/callback?code=oauth-code&redirect_to=/dashboard')
    const client = await clientPersistingThrough(event, { commitDuringCall: true })
    supabaseServerClient.mockResolvedValue(client)

    const callbackHandler = (await import('../../src/runtime/server/auth/callback')).default

    await expect(callbackHandler(event)).rejects.toThrow('could not be persisted')
    expect(client.auth.exchangeCodeForSession).toHaveBeenCalledWith('oauth-code')
    // A 302 here would hand the browser a "signed in" redirect while the
    // browser still holds the old (or no) session.
    expect(event.node.res.getHeader('location')).toBeUndefined()
    expect(event.node.res.statusCode).not.toBe(302)
  })

  it('does not redirect OTP confirmation as authenticated', async () => {
    const { event } = createTestEvent('/auth/confirm?token_hash=token-hash&type=magiclink&redirect_to=/welcome')
    const client = await clientPersistingThrough(event, { commitDuringCall: true })
    supabaseServerClient.mockResolvedValue(client)

    const confirmHandler = (await import('../../src/runtime/server/auth/confirm')).default

    await expect(confirmHandler(event)).rejects.toThrow('could not be persisted')
    expect(client.auth.verifyOtp).toHaveBeenCalledWith({ type: 'magiclink', token_hash: 'token-hash' })
    expect(event.node.res.getHeader('location')).toBeUndefined()
    expect(event.node.res.statusCode).not.toBe(302)
  })

  it('redirects normally once the session is persisted', async () => {
    const { event, res } = createTestEvent('/auth/callback?code=oauth-code&redirect_to=/dashboard')
    supabaseServerClient.mockResolvedValue(await clientPersistingThrough(event))

    const callbackHandler = (await import('../../src/runtime/server/auth/callback')).default
    await callbackHandler(event)

    expect(res.getHeader('location')).toBe('/dashboard')
    expect(res.statusCode).toBe(302)
    const cookies = res.getHeader('set-cookie') as string[]
    expect(cookies).toHaveLength(2)
    expect(cookies[0]).toContain('sb-api-auth-token.0=base64-chunk-zero')
    expect(res.getHeader('cache-control')).toContain('no-store')
  })
})
