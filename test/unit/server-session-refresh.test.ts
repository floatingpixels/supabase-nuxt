import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { createEvent, getResponseHeader } from 'h3'
import type { H3Event } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Unlike the other server tests, this one runs the real @supabase/ssr and
// auth-js: the bug it guards against lives in the interplay between the
// background task @supabase/ssr's onAuthStateChange subscription starts and the
// response lifecycle, which a mocked createServerClient cannot reproduce. Only
// the network is stubbed, through the `global.fetch` client option.

const useRuntimeConfig = vi.fn()

vi.mock('#imports', () => ({
  useRuntimeConfig,
}))

// The auth routes reach the real service through the alias as well.
vi.mock('#supabase/server', async () => await import('../../src/runtime/server/services'))

const SUPABASE_URL = 'https://project.supabase.co'
const STORAGE_KEY = 'sb-project-auth-token'

const user = {
  id: '11111111-1111-1111-1111-111111111111',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'user@example.com',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
}

const sessionExpiringIn = (seconds: number, tokens: { access: string, refresh: string }) => ({
  access_token: tokens.access,
  refresh_token: tokens.refresh,
  token_type: 'bearer',
  expires_in: seconds,
  expires_at: Math.floor(Date.now() / 1000) + seconds,
  user,
})

const sessionCookie = (session: object) =>
  `${STORAGE_KEY}=base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`

const createTestEvent = (cookie?: string, url = '/login') => {
  const req = new IncomingMessage(new Socket())
  req.method = 'GET'
  req.url = url
  req.headers.host = 'localhost:3000'
  if (cookie) req.headers.cookie = cookie
  const res = new ServerResponse(req)
  return { event: createEvent(req, res), res }
}

const setCookieHeader = (event: H3Event) => {
  const header = getResponseHeader(event, 'set-cookie')
  if (header === undefined) return []
  return Array.isArray(header) ? header.map(String) : [String(header)]
}

// A rejected refresh token, as GoTrue answers it.
const deadRefreshToken = () => new Response(
  JSON.stringify({ code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' }),
  { status: 400, headers: { 'content-type': 'application/json' } },
)

// Lets every pending promise chain and timer callback run, long enough for a
// background refresh against the stubbed fetch to complete.
const settle = () => new Promise(resolve => setTimeout(resolve, 20))

describe('server client session refresh', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let refreshResponse: () => Response
  const unhandled: unknown[] = []
  const onUnhandled = (reason: unknown) => {
    unhandled.push(reason)
  }

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    unhandled.length = 0
    process.on('unhandledRejection', onUnhandled)

    refreshResponse = () => new Response(
      JSON.stringify(sessionExpiringIn(3600, { access: 'rotated-access', refresh: 'rotated-refresh' })),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )
    fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      // Every Auth request takes a network round trip.
      await new Promise(resolve => setTimeout(resolve, 2))
      if (url.includes('/auth/v1/token') && url.includes('grant_type=refresh_token')) {
        return refreshResponse()
      }
      if (url.includes('/auth/v1/token') && url.includes('grant_type=pkce')) {
        const { code_verifier } = JSON.parse(String(init?.body)) as { code_verifier?: string }
        return code_verifier === 'pkce-verifier'
          ? new Response(
              JSON.stringify(sessionExpiringIn(3600, { access: 'exchanged-access', refresh: 'exchanged-refresh' })),
              { status: 200, headers: { 'content-type': 'application/json' } },
            )
          : new Response(
              JSON.stringify({ code: 400, error_code: 'bad_code_verifier', msg: 'code challenge does not match' }),
              { status: 400, headers: { 'content-type': 'application/json' } },
            )
      }
      return new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } })
    })

    useRuntimeConfig.mockReturnValue({
      app: { baseURL: '/' },
      public: {
        supabase: {
          url: SUPABASE_URL,
          publishableKey: 'publishable-key',
          clientOptions: { global: { fetch: fetchMock } },
          redirectOptions: { login: '/login', exclude: [], confirm: '', authError: '' },
        },
      },
    })
  })

  afterEach(() => {
    process.off('unhandledRejection', onUnhandled)
  })

  const refreshCalls = () =>
    fetchMock.mock.calls.filter(([input]) => String(input).includes('grant_type=refresh_token'))

  it('persists a near-expiry refresh before resolving, even when nothing awaits a session call', async () => {
    const { event, res } = createTestEvent(
      sessionCookie(sessionExpiringIn(30, { access: 'stale-access', refresh: 'stale-refresh' })),
    )
    const { supabaseServerClient } = await import('../../src/runtime/server/services/supabaseServerClient')

    await supabaseServerClient(event)

    // The rotated session is on the response before the client is handed out.
    const written = setCookieHeader(event).join('\n')
    expect(written).toContain(`${STORAGE_KEY}=`)
    expect(written).not.toContain('stale-refresh')
    expect(getResponseHeader(event, 'cache-control')).toContain('no-store')

    // A page that awaits nothing sends its response straight away. Nothing may
    // still be pending that would try to write cookies after that.
    res.writeHead(200)
    res.end()
    await settle()

    expect(unhandled).toEqual([])
    // The background INITIAL_SESSION task joined the same refresh.
    expect(refreshCalls()).toHaveLength(1)
  })

  it('gives concurrent callers on one request the client only after the cookies are written', async () => {
    const { event } = createTestEvent(
      sessionCookie(sessionExpiringIn(30, { access: 'stale-access', refresh: 'stale-refresh' })),
    )
    const { supabaseServerClient } = await import('../../src/runtime/server/services/supabaseServerClient')

    const first = supabaseServerClient(event)
    const second = await supabaseServerClient(event)

    expect(setCookieHeader(event).join('\n')).toContain(`${STORAGE_KEY}=`)
    expect(second).toBe(await first)
    expect(refreshCalls()).toHaveLength(1)
  })

  it('surfaces a refresh it cannot persist to the caller', async () => {
    const { event, res } = createTestEvent(
      sessionCookie(sessionExpiringIn(30, { access: 'stale-access', refresh: 'stale-refresh' })),
    )
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { supabaseServerClient } = await import('../../src/runtime/server/services/supabaseServerClient')

    // A server route that creates the client only after sending its response.
    res.writeHead(200)

    await expect(supabaseServerClient(event)).rejects.toThrow('could not be persisted')
    // auth-js's own INITIAL_SESSION tasks share the failed refresh and report
    // it as well, out of this module's reach; drain them so they do not land
    // in the next test.
    await settle()

    error.mockRestore()
  })

  it.each([
    ['by default', {}],
    ['with throwOnError', { throwOnError: true }],
  ])('treats a spent refresh token as signed out %s', async (_, auth) => {
    refreshResponse = deadRefreshToken
    useRuntimeConfig.mockReturnValue({
      public: {
        supabase: {
          url: SUPABASE_URL,
          publishableKey: 'publishable-key',
          clientOptions: { global: { fetch: fetchMock }, auth },
          redirectOptions: { login: '/login', exclude: [], confirm: '', authError: '' },
        },
      },
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { event, res } = createTestEvent(
      sessionCookie(sessionExpiringIn(-10, { access: 'expired-access', refresh: 'spent-refresh' })),
    )
    const { supabaseServerClient } = await import('../../src/runtime/server/services/supabaseServerClient')

    await supabaseServerClient(event)

    // The dead session is cleared on the response that is still open.
    const cleared = setCookieHeader(event).find(cookie => cookie.startsWith(`${STORAGE_KEY}=`))
    expect(cleared).toContain('Max-Age=0')

    res.writeHead(200)
    res.end()
    await settle()
    // Under throwOnError auth-js's own INITIAL_SESSION tasks reject with the
    // AuthApiError (with or without this module); nothing may be ours.
    expect(unhandled.filter(reason => !(reason instanceof Error && reason.name === 'AuthApiError'))).toEqual([])

    warn.mockRestore()
  })

  it('leaves a fresh session alone: no refresh, no cookies, cacheable response', async () => {
    const { event, res } = createTestEvent(
      sessionCookie(sessionExpiringIn(3600, { access: 'fresh-access', refresh: 'fresh-refresh' })),
    )
    const { supabaseServerClient } = await import('../../src/runtime/server/services/supabaseServerClient')

    await supabaseServerClient(event)
    res.writeHead(200)
    res.end()
    await settle()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(setCookieHeader(event)).toEqual([])
    expect(getResponseHeader(event, 'cache-control')).toBeUndefined()
    expect(unhandled).toEqual([])
  })

  it('does nothing for an anonymous request', async () => {
    const { event, res } = createTestEvent()
    const { supabaseServerClient } = await import('../../src/runtime/server/services/supabaseServerClient')

    await supabaseServerClient(event)
    res.writeHead(200)
    res.end()
    await settle()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(setCookieHeader(event)).toEqual([])
    expect(unhandled).toEqual([])
  })

  it('signs in through the OAuth callback even when the browser still holds a dead session', async () => {
    // Signing the dead session out deletes every PKCE code verifier, so the
    // exchange has to read its verifier before that sign-out can happen.
    refreshResponse = deadRefreshToken
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const verifier = `${STORAGE_KEY}-code-verifier=base64-${Buffer.from(JSON.stringify('pkce-verifier')).toString('base64url')}`
    const { event, res } = createTestEvent(
      `${sessionCookie(sessionExpiringIn(-10, { access: 'expired-access', refresh: 'dead-refresh' }))}; ${verifier}`,
      '/auth/callback?code=oauth-code&redirect_to=/dashboard',
    )

    const callback = (await import('../../src/runtime/server/auth/callback')).default
    await callback(event)

    expect(res.statusCode).toBe(302)
    expect(res.getHeader('location')).toBe('/dashboard')
    // The exchanged session is what the browser ends up with.
    const sessionWrites = setCookieHeader(event).filter(cookie => cookie.startsWith(`${STORAGE_KEY}=`))
    expect(sessionWrites.at(-1)).not.toContain('Max-Age=0')
    expect(Buffer.from(sessionWrites.at(-1)!.split(';')[0]!.split('=base64-')[1]!, 'base64url').toString())
      .toContain('exchanged-refresh')

    await settle()
    expect(unhandled).toEqual([])
    warn.mockRestore()
  })
})
