import { fileURLToPath } from 'node:url'
import type { BrowserContext, Cookie } from '@playwright/test'
import { createChunks, stringFromBase64URL, stringToBase64URL } from '@supabase/ssr'
import { expect, test } from '@nuxt/test-utils/playwright'
import { createConfirmedUser, signInWithPassword, uniqueEmail } from './support'

// A session close to expiry must be refreshed, and its cookies written, on the
// SSR response of a page where nothing awaits a session call: one the redirect
// middleware skips (an app's login page, typically) that makes no Supabase
// call itself, like the playground's `/public`. Before the fix, the refresh
// that creating the server client starts finished after the response was
// sent, so the server logged an unhandled rejection and the browser kept the
// superseded cookies.
test.use({
  nuxt: {
    rootDir: fileURLToPath(new URL('../../playground/', import.meta.url)),
  },
})

type StoredSession = { access_token: string, refresh_token: string, expires_at: number }

const AUTH_COOKIE = /^(sb-[^.]+-auth-token)(?:\.(\d+))?$/

/** The session cookie (all chunks, in order) as @supabase/ssr stores it. */
const sessionCookies = async (context: BrowserContext) => {
  const cookies = (await context.cookies()).filter(cookie => AUTH_COOKIE.test(cookie.name))
  const index = (cookie: Cookie) => Number(cookie.name.match(AUTH_COOKIE)![2] ?? -1)
  return cookies.sort((a, b) => index(a) - index(b))
}

const readSession = (cookies: Cookie[]): StoredSession => {
  const value = cookies.map(cookie => cookie.value).join('')
  expect(value.startsWith('base64-')).toBe(true)
  return JSON.parse(stringFromBase64URL(value.slice('base64-'.length)))
}

/**
 * Rewrites the stored session so auth-js considers it inside its refresh
 * margin. auth-js judges expiry by the stored `expires_at`, not by the JWT, so
 * the real tokens stay usable and the refresh runs against the local stack.
 */
const moveExpiryTo = async (context: BrowserContext, cookies: Cookie[], expiresAt: number) => {
  const session = { ...readSession(cookies), expires_at: expiresAt }
  const key = cookies[0]!.name.match(AUTH_COOKIE)![1]!
  const { domain, path, sameSite, secure, httpOnly } = cookies[0]!

  await context.clearCookies({ name: AUTH_COOKIE })
  await context.addCookies(
    createChunks(key, `base64-${stringToBase64URL(JSON.stringify(session))}`).map(chunk => ({
      ...chunk,
      domain,
      path,
      sameSite,
      secure,
      httpOnly,
    })),
  )
}

test('refreshes a near-expiry session on the response of a page that awaits no session call', async ({ page, goto }) => {
  const { email, password } = await createConfirmedUser(uniqueEmail('refresh'))
  await goto('/sign-in', { waitUntil: 'hydration' })
  await signInWithPassword(page, email, password)

  // Leave the app so the browser client's own refresh timer cannot step in:
  // only the server may refresh in this test.
  await page.goto('about:blank')

  const context = page.context()
  const signedIn = readSession(await sessionCookies(context))
  await moveExpiryTo(context, await sessionCookies(context), Math.floor(Date.now() / 1000) + 30)

  const response = await context.request.get('/public')
  expect(response.status()).toBe(200)

  // The rotated session arrives on this very response, kept out of caches.
  const setCookies = response.headersArray().filter(header => header.name.toLowerCase() === 'set-cookie')
  expect(setCookies.some(header => AUTH_COOKIE.test(header.value.split('=')[0]!))).toBe(true)
  expect(response.headers()['cache-control']).toContain('no-store')

  // The request context shares the browser's cookie jar, so it now holds the
  // rotated session, and the server accepts it.
  const refreshed = readSession(await sessionCookies(context))
  expect(refreshed.refresh_token).not.toBe(signedIn.refresh_token)
  expect(refreshed.expires_at * 1000).toBeGreaterThan(Date.now() + 60_000)

  const session = await context.request.get('/api/session')
  expect((await session.json()).user?.email).toBe(email)
})
