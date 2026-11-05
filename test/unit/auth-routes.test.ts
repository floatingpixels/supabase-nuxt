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

const withRedirectOptions = (redirectOptions: Record<string, unknown>) => {
  useRuntimeConfig.mockReturnValue({
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

    it('hands a GET over to the confirm page without consuming the token', async () => {
      const result = await run(await handlers.confirm(), '/auth/confirm?token_hash=hash&type=recovery&next=/account/password')

      expect(verifyOtp).not.toHaveBeenCalled()
      expect(result).toMatchObject({
        status: 302,
        location: '/auth/confirm-link?token_hash=hash&type=recovery&redirect_to=%2Faccount%2Fpassword',
      })
    })

    it('verifies the POST from the confirm page and answers 303', async () => {
      const result = await run(await handlers.confirmPost(), '/auth/confirm', {
        method: 'POST',
        body: 'token_hash=hash&type=recovery&redirect_to=%2Faccount%2Fpassword',
        headers: { 'sec-fetch-site': 'same-origin' },
      })

      expect(verifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'hash' })
      expect(result).toMatchObject({ status: 303, location: '/account/password' })
      expect(result.res.getHeader('cache-control')).toContain('no-store')
    })

    it('rejects cross-site POSTs before verifying', async () => {
      for (const site of ['cross-site', 'same-site']) {
        const result = await run(await handlers.confirmPost(), '/auth/confirm', {
          method: 'POST',
          body: 'token_hash=hash&type=email',
          headers: { 'sec-fetch-site': site },
        })
        expect(result.error, site).toMatchObject({ statusCode: 403 })
      }
      expect(verifyOtp).not.toHaveBeenCalled()
    })

    it('validates the posted fields like the GET route', async () => {
      const confirmPost = await handlers.confirmPost()
      const post = (body: string) => run(confirmPost, '/auth/confirm', { method: 'POST', body })

      expect((await post('type=email')).error).toMatchObject({ statusCode: 400, message: 'Invalid token' })
      expect((await post('token_hash=hash&type=email&redirect_to=%2F%2Fevil.example.com')).error).toMatchObject({ statusCode: 400 })
      expect(verifyOtp).not.toHaveBeenCalled()
    })

    it('sends POST failures to the error page with 303', async () => {
      withRedirectOptions({ confirm: '/auth/confirm-link', authError: '/login' })
      verifyOtp.mockResolvedValueOnce({ error: { message: 'expired', status: 403, code: 'otp_expired' } })

      const result = await run(await handlers.confirmPost(), '/auth/confirm', { method: 'POST', body: 'token_hash=hash&type=invite' })

      expect(result).toMatchObject({ status: 303, location: '/login?error=otp_expired&redirect_to=%2F' })
    })
  })

  it('answers POST with 405 while two-step confirmation is off', async () => {
    const result = await run(await handlers.confirmPost(), '/auth/confirm', { method: 'POST', body: 'token_hash=hash&type=email' })

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
