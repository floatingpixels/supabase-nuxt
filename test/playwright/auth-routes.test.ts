import { fileURLToPath } from 'node:url'
import { expect, test } from '@nuxt/test-utils/playwright'

// Request-level checks of the built-in auth routes over real HTTP: status
// codes, redirect suppression, and cache headers as the wire sees them.
test.use({
  nuxt: {
    rootDir: fileURLToPath(new URL('../../playground/', import.meta.url)),
  },
})

const routes = [
  { path: '/auth/callback', validQuery: 'code=bogus-code' },
  { path: '/auth/confirm', validQuery: 'token_hash=1234567890&type=email' },
]

for (const { path, validQuery } of routes) {
  test(`${path} answers 400 without required parameters`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 })

    expect(response.status()).toBe(400)
    expect(response.headers()['cache-control']).toContain('no-store')
  })

  test(`${path} answers 400 for unsafe redirect targets`, async ({ request }) => {
    for (const redirectTo of ['https://evil.example.com/account', '//evil.example.com/account', '/%2Fevil.example.com']) {
      const response = await request.get(
        `${path}?${validQuery}&redirect_to=${encodeURIComponent(redirectTo)}`,
        { maxRedirects: 0 },
      )

      expect(response.status(), `redirect_to=${redirectTo}`).toBe(400)
      expect(response.headers()['location']).toBeUndefined()
      expect(response.headers()['cache-control']).toContain('no-store')
    }
  })

  test(`${path} answers a client error, not a redirect, for a bogus token`, async ({ request }) => {
    const response = await request.get(`${path}?${validQuery}&redirect_to=/dashboard`, { maxRedirects: 0 })

    // GoTrue rejects the fake code/token; the route must pass that through as
    // a 4xx instead of masking it as a server error or redirecting.
    expect(response.status()).toBeGreaterThanOrEqual(400)
    expect(response.status()).toBeLessThan(500)
    expect(response.headers()['location']).toBeUndefined()
    expect(response.headers()['cache-control']).toContain('no-store')
  })
}

test('/auth/confirm refuses POST while two-step confirmation is off', async ({ request }) => {
  const response = await request.post('/auth/confirm', {
    form: { token_hash: '1234567890', type: 'email' },
    maxRedirects: 0,
  })

  expect(response.status()).toBe(405)
  expect(response.headers()['cache-control']).toContain('no-store')
})

test('/auth/confirm accepts an absolute redirect_to only on its own host', async ({ request, baseURL }) => {
  // Supabase's {{ .RedirectTo }} is absolute. GoTrue still rejects the bogus
  // token, but only after the redirect target passed validation.
  const sameHost = await request.get(
    `/auth/confirm?token_hash=1234567890&type=email&redirect_to=${encodeURIComponent(`${baseURL}welcome`)}`,
    { maxRedirects: 0 },
  )
  expect(sameHost.status()).toBe(403)

  const otherHost = await request.get(
    `/auth/confirm?token_hash=1234567890&type=email&redirect_to=${encodeURIComponent('http://evil.example.com/welcome')}`,
    { maxRedirects: 0 },
  )
  expect(otherHost.status()).toBe(400)
})
