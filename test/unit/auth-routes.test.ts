import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { createEvent } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The built-in auth routes over real h3 events: `next` alias, error page
// redirects, two-step confirmation and PKCE flow ids. Only the runtime config
// and the Supabase client are stubbed.

const useRuntimeConfig = vi.fn()
const verifyOtp = vi.fn()
const exchangeCodeForSession = vi.fn()

vi.mock('#imports', () => ({ useRuntimeConfig }))
vi.mock('#supabase/server', () => ({
  supabaseServerClient: vi.fn(async () => ({ auth: { verifyOtp, exchangeCodeForSession } })),
}))

const withRedirectOptions = (redirectOptions: Record<string, unknown>, baseURL = '/') => {
  useRuntimeConfig.mockReturnValue({
    app: { baseURL },
    public: { supabase: { redirectOptions: { login: '/login', exclude: [], confirm: '', authError: '', ...redirectOptions } } },
  })
}

const createTestEvent = (
  url: string,
  { method = 'GET', body, headers = {} }: { method?: string, body?: string, headers?: Record<string, string> } = {},
) => {
  const req = new IncomingMessage(new Socket())
  req.method = method
  req.url = url
  req.headers = { host: 'localhost:3000', ...headers }
  if (body !== undefined) {
    req.headers['content-type'] = 'application/x-www-form-urlencoded'
    req.headers['content-length'] = String(Buffer.byteLength(body))
    req.push(body)
    req.push(null)
  }
  const res = new ServerResponse(req)
  return { event: createEvent(req, res), res }
}

const handlers = {
  confirm: async () => (await import('../../src/runtime/server/auth/confirm')).default,
  confirmPost: async () => (await import('../../src/runtime/server/auth/confirm.post')).default,
  callback: async () => (await import('../../src/runtime/server/auth/callback')).default,
}

type Handler = Awaited<ReturnType<(typeof handlers)[keyof typeof handlers]>>

const run = async (handler: Handler, url: string, init?: Parameters<typeof createTestEvent>[1]) => {
  const { event, res } = createTestEvent(url, init)
  try {
    await handler(event)
  } catch (error) {
    return { res, error: error as { statusCode: number, message: string } }
  }
  return { res, location: res.getHeader('location') as string | undefined, status: res.statusCode }
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  withRedirectOptions({})
  verifyOtp.mockResolvedValue({ error: null })
  exchangeCodeForSession.mockResolvedValue({ error: null })
})

describe('/auth/confirm', () => {
  it.each(['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'])(
    'verifies a %s link and redirects to its destination',
    async type => {
      const result = await run(await handlers.confirm(), `/auth/confirm?token_hash=hash&type=${type}&redirect_to=/account/password`)

      expect(verifyOtp).toHaveBeenCalledWith({ type, token_hash: 'hash' })
      expect(result).toMatchObject({ status: 302, location: '/account/password' })
    },
  )

  it('rejects an unknown type without calling Supabase', async () => {
    const result = await run(await handlers.confirm(), '/auth/confirm?token_hash=hash&type=sms')

    expect(result.error).toMatchObject({ statusCode: 400, message: 'Invalid token' })
    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it('accepts `next` as an alias for `redirect_to`, with the same validation', async () => {
    const confirm = await handlers.confirm()

    expect(await run(confirm, '/auth/confirm?token_hash=hash&type=recovery&next=/account')).toMatchObject({ location: '/account' })
    expect(await run(confirm, '/auth/confirm?token_hash=hash&type=email&redirect_to=/a&next=/b')).toMatchObject({ location: '/a' })

    for (const next of ['https://evil.example.com', '//evil.example.com', '/%2Fevil.example.com', '/\t/evil.example.com']) {
      const result = await run(confirm, `/auth/confirm?token_hash=hash&type=email&next=${encodeURIComponent(next)}`)
      expect(result.error, next).toMatchObject({ statusCode: 400, message: 'Invalid redirect_to' })
    }
    // An invalid redirect_to never falls back to a valid next.
    const mixed = await run(confirm, `/auth/confirm?token_hash=hash&type=email&redirect_to=${encodeURIComponent('//evil.example.com')}&next=/ok`)
    expect(mixed.error).toMatchObject({ statusCode: 400 })
  })

  it('accepts Supabase\'s absolute {{ .RedirectTo }} only on the request\'s own host, as a path', async () => {
    const confirm = await handlers.confirm()
    const link = (target: string) => `/auth/confirm?token_hash=hash&type=email&redirect_to=${encodeURIComponent(target)}`

    // The test request's Host header is localhost:3000.
    expect(await run(confirm, link('http://localhost:3000/welcome?tab=1'))).toMatchObject({ status: 302, location: '/welcome?tab=1' })
    expect(await run(confirm, link('HTTPS://LOCALHOST:3000'))).toMatchObject({ status: 302, location: '/' })

    for (const target of [
      'http://evil.example.com/welcome',
      'http://localhost:3001/welcome',
      'http://localhost:3000@evil.example.com/',
      'http://user:pass@localhost:3000/welcome',
      'http://localhost:3000//evil.example.com',
      'http://localhost:3000/\t/evil.example.com',
      'javascript://localhost:3000/%0aalert(1)',
    ]) {
      const result = await run(confirm, link(target))
      expect(result.error, target).toMatchObject({ statusCode: 400, message: 'Invalid redirect_to' })
    }
    expect(verifyOtp).toHaveBeenCalledTimes(2)
  })

  it('also recognises the public host from X-Forwarded-Host behind a proxy', async () => {
    const confirm = await handlers.confirm()
    const link = `/auth/confirm?token_hash=hash&type=email&redirect_to=${encodeURIComponent('https://app.example.com/welcome')}`

    expect(await run(confirm, link, { headers: { 'x-forwarded-host': 'app.example.com' } })).toMatchObject({ status: 302, location: '/welcome' })
    expect((await run(confirm, link)).error).toMatchObject({ statusCode: 400 })
  })

  it('names a misconfigured confirm or authError page instead of failing every link obscurely', async () => {
    for (const [name, value] of [['authError', 'https://example.com/auth/error'], ['authError', '/auth/error#details'], ['confirm', 'auth/confirm-link'], ['confirm', '//evil.example.com']]) {
      withRedirectOptions({ [name!]: value })
      const result = await run(await handlers.confirm(), '/auth/confirm?type=email')
      expect(result.error, `${name}=${value}`).toMatchObject({ statusCode: 500 })
      expect((result.error as unknown as { statusMessage: string }).statusMessage).toContain(`redirectOptions.${name}`)
    }
  })

  describe('with redirectOptions.authError', () => {
    beforeEach(() => withRedirectOptions({ authError: '/login' }))

    it('redirects a failed verification to the error page with Supabase\'s error code', async () => {
      verifyOtp.mockResolvedValueOnce({ error: { message: 'Email link is invalid or has expired', status: 403, code: 'otp_expired' } })

      const result = await run(await handlers.confirm(), '/auth/confirm?token_hash=hash&type=invite&redirect_to=/account/password')

      expect(result).toMatchObject({ status: 302, location: '/login?error=otp_expired&redirect_to=%2Faccount%2Fpassword' })
      expect(result.res.getHeader('cache-control')).toContain('no-store')
    })

    it('falls back to a generic code for missing or unusual Supabase codes', async () => {
      verifyOtp.mockResolvedValueOnce({ error: { message: 'boom', status: 500 } })
      verifyOtp.mockResolvedValueOnce({ error: { message: 'boom', status: 400, code: 'Not A Code<script>' } })
      const confirm = await handlers.confirm()

      expect(await run(confirm, '/auth/confirm?token_hash=hash&type=email')).toMatchObject({ location: '/login?error=auth_error&redirect_to=%2F' })
      expect(await run(confirm, '/auth/confirm?token_hash=hash&type=email')).toMatchObject({ location: '/login?error=auth_error&redirect_to=%2F' })
    })

    it('redirects incomplete links and invalid destinations without passing the destination on', async () => {
      const confirm = await handlers.confirm()

      expect(await run(confirm, '/auth/confirm?type=email&redirect_to=/a')).toMatchObject({ location: '/login?error=invalid_request&redirect_to=%2Fa' })
      expect(await run(confirm, `/auth/confirm?token_hash=hash&type=email&redirect_to=${encodeURIComponent('//evil.example.com')}`))
        .toMatchObject({ status: 302, location: '/login?error=invalid_redirect' })
      expect(verifyOtp).not.toHaveBeenCalled()
    })

    it('keeps an existing query on the error page', async () => {
      withRedirectOptions({ authError: '/login?mode=link' })
      const result = await run(await handlers.confirm(), '/auth/confirm?type=email')

      expect(result.location).toBe('/login?mode=link&error=invalid_request&redirect_to=%2F')
    })
  })

  describe('with redirectOptions.confirm (two-step)', () => {
    beforeEach(() => withRedirectOptions({ confirm: '/auth/confirm-link' }))

    // The cookie GET /auth/confirm parks a link in, as the browser sends it back.
    const parked = (fields: Record<string, string>) =>
      `supabase-nuxt-confirm=${encodeURIComponent(new URLSearchParams(fields).toString())}`
    const setCookieHeader = (res: ServerResponse) => [res.getHeader('set-cookie') ?? []].flat().join('\n')
    const post = async (cookie: string | undefined, headers: Record<string, string> = {}) =>
      run(await handlers.confirmPost(), '/auth/confirm', {
        method: 'POST',
        headers: { ...(cookie ? { cookie } : {}), ...headers },
      })

    it('parks a GET in a cookie and opens the confirm page without the token in its URL', async () => {
      const result = await run(await handlers.confirm(), '/auth/confirm?token_hash=hash&type=recovery&next=/account/password')

      expect(verifyOtp).not.toHaveBeenCalled()
      expect(result).toMatchObject({ status: 302, location: '/auth/confirm-link' })
      const cookie = setCookieHeader(result.res)
      expect(cookie).toContain(parked({ token_hash: 'hash', type: 'recovery', redirect_to: '/account/password' }))
      expect(cookie).toContain('Max-Age=600')
      expect(cookie).toContain('Path=/auth/confirm')
      expect(cookie).toContain('HttpOnly')
      expect(cookie).toContain('SameSite=Lax')
      expect(cookie).not.toContain('Secure')

      const https = await run(await handlers.confirm(), '/auth/confirm?token_hash=hash&type=email', { headers: { 'x-forwarded-proto': 'https' } })
      expect(setCookieHeader(https.res)).toContain('Secure')
    })

    it('validates the link before parking it', async () => {
      const result = await run(await handlers.confirm(), '/auth/confirm?type=email')

      expect(result.error).toMatchObject({ statusCode: 400, message: 'Invalid token' })
      expect(setCookieHeader(result.res)).toBe('')
    })

    it('verifies the parked link on POST, clears the cookie and answers 303', async () => {
      const get = await run(await handlers.confirm(), '/auth/confirm?token_hash=hash&type=recovery&redirect_to=/account/password')
      const cookie = setCookieHeader(get.res).split(';')[0]

      const result = await post(cookie, { 'sec-fetch-site': 'same-origin' })

      expect(verifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'hash' })
      expect(result).toMatchObject({ status: 303, location: '/account/password' })
      expect(result.res.getHeader('cache-control')).toContain('no-store')
      expect(setCookieHeader(result.res)).toMatch(/supabase-nuxt-confirm=;.*Max-Age=0.*Path=\/auth\/confirm/)
    })

    it('keeps the cookie and the page redirects under app.baseURL', async () => {
      withRedirectOptions({ confirm: '/auth/confirm-link', authError: '/auth/error' }, '/app/')

      const get = await run(await handlers.confirm(), '/app/auth/confirm?token_hash=hash&type=email&redirect_to=/app/welcome')
      expect(get).toMatchObject({ status: 302, location: '/app/auth/confirm-link' })
      expect(setCookieHeader(get.res)).toContain('Path=/app/auth/confirm')

      const confirmed = await post(setCookieHeader(get.res).split(';')[0])
      expect(confirmed).toMatchObject({ status: 303, location: '/app/welcome' })
      expect(setCookieHeader(confirmed.res)).toContain('Path=/app/auth/confirm')

      expect(await post(undefined)).toMatchObject({ status: 303, location: '/app/auth/error?error=otp_expired' })
    })

    it('treats a POST without a parked link as an expired link', async () => {
      const result = await post(undefined, { 'sec-fetch-site': 'same-origin' })
      expect(result.error).toMatchObject({ statusCode: 400, message: 'Email link expired or already used' })

      withRedirectOptions({ confirm: '/auth/confirm-link', authError: '/login' })
      expect(await post(undefined)).toMatchObject({ status: 303, location: '/login?error=otp_expired' })
      expect(verifyOtp).not.toHaveBeenCalled()
    })

    it('rejects cross-site POSTs before touching the parked link', async () => {
      for (const site of ['cross-site', 'same-site']) {
        const result = await post(parked({ token_hash: 'hash', type: 'email' }), { 'sec-fetch-site': site })
        expect(result.error, site).toMatchObject({ statusCode: 403 })
        expect(setCookieHeader(result.res)).toBe('')
      }
      expect(verifyOtp).not.toHaveBeenCalled()
    })

    it('falls back to Origin when Sec-Fetch-Site is missing (older browsers)', async () => {
      const cookie = parked({ token_hash: 'hash', type: 'email' })

      for (const origin of ['http://evil.example.com', 'null', 'http://localhost:3001']) {
        expect((await post(cookie, { origin })).error, origin).toMatchObject({ statusCode: 403 })
      }
      expect(verifyOtp).not.toHaveBeenCalled()

      expect(await post(cookie, { origin: 'http://localhost:3000' })).toMatchObject({ status: 303 })
      // Behind a proxy that rewrites Host, the public host arrives as X-Forwarded-Host.
      expect(await post(cookie, { 'origin': 'https://app.example.com', 'x-forwarded-host': 'app.example.com' })).toMatchObject({ status: 303 })
      // No browser headers at all: not a browser, so no login CSRF vector.
      expect(await post(cookie)).toMatchObject({ status: 303 })
      expect(verifyOtp).toHaveBeenCalledTimes(3)
    })

    it('validates a tampered cookie like a link', async () => {
      expect((await post(parked({ type: 'email' }))).error).toMatchObject({ statusCode: 400, message: 'Invalid token' })
      expect((await post(parked({ token_hash: 'hash', type: 'email', redirect_to: '//evil.example.com' }))).error).toMatchObject({ statusCode: 400 })
      expect(verifyOtp).not.toHaveBeenCalled()
    })

    it('sends POST failures to the error page with 303', async () => {
      withRedirectOptions({ confirm: '/auth/confirm-link', authError: '/login' })
      verifyOtp.mockResolvedValueOnce({ error: { message: 'expired', status: 403, code: 'otp_expired' } })

      const result = await post(parked({ token_hash: 'hash', type: 'invite', redirect_to: '/account' }))

      expect(result).toMatchObject({ status: 303, location: '/login?error=otp_expired&redirect_to=%2Faccount' })
    })
  })

  it('answers POST with 405 while two-step confirmation is off', async () => {
    const result = await run(await handlers.confirmPost(), '/auth/confirm', { method: 'POST' })

    expect(result.error).toMatchObject({ statusCode: 405 })
    expect(verifyOtp).not.toHaveBeenCalled()
  })
})

describe('/auth/callback', () => {
  it('accepts `next` and passes the PKCE flow id on when present', async () => {
    const callback = await handlers.callback()

    expect(await run(callback, '/auth/callback?code=c1&next=/dashboard')).toMatchObject({ status: 302, location: '/dashboard' })
    expect(exchangeCodeForSession).toHaveBeenLastCalledWith('c1')

    await run(callback, '/auth/callback?code=c2&sb_flow_id=flow-1')
    expect(exchangeCodeForSession).toHaveBeenLastCalledWith('c2', { flowId: 'flow-1' })
  })

  it('throws for provider errors by default', async () => {
    const result = await run(await handlers.callback(), '/auth/callback?error=access_denied&error_description=User+cancelled')

    expect(result.error).toMatchObject({ statusCode: 400, message: 'No code provided' })
  })

  describe('with redirectOptions.authError', () => {
    beforeEach(() => withRedirectOptions({ authError: '/login' }))

    it('forwards the provider\'s error code', async () => {
      const callback = await handlers.callback()

      expect(await run(callback, '/auth/callback?error=access_denied&error_code=provider_cancelled&redirect_to=/a'))
        .toMatchObject({ location: '/login?error=provider_cancelled&redirect_to=%2Fa' })
      expect(await run(callback, '/auth/callback?error=access_denied'))
        .toMatchObject({ location: '/login?error=access_denied&redirect_to=%2F' })
      expect(exchangeCodeForSession).not.toHaveBeenCalled()
    })

    it('redirects a failed code exchange', async () => {
      exchangeCodeForSession.mockResolvedValueOnce({ error: { message: 'invalid flow state', status: 404, code: 'flow_state_not_found' } })

      const result = await run(await handlers.callback(), '/auth/callback?code=c1')

      expect(result).toMatchObject({ status: 302, location: '/login?error=flow_state_not_found&redirect_to=%2F' })
    })
  })
})
