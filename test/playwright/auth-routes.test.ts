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
