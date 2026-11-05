import { fileURLToPath } from 'node:url'
import { expect, test } from '@nuxt/test-utils/playwright'
import { createConfirmedUser, emailLink, serverSessionEmail, uniqueEmail } from './support'

// The opt-in options, set at runtime through Nuxt's env overrides:
// two-step confirmation (redirectOptions.confirm) and the auth error page
// (redirectOptions.authError).
test.use({
  nuxt: {
    rootDir: fileURLToPath(new URL('../../playground/', import.meta.url)),
    env: {
      NUXT_PUBLIC_SUPABASE_REDIRECT_OPTIONS_CONFIRM: '/auth/confirm-link',
      NUXT_PUBLIC_SUPABASE_REDIRECT_OPTIONS_AUTH_ERROR: '/auth/error',
    },
  },
})

const requestMagicLink = async (page: import('@playwright/test').Page, email: string) => {
  await page.locator('input[type="email"]').fill(email)
  await page.getByRole('button', { name: 'Sign In with E-Mail', exact: true }).click()
  await expect(page.getByTestId('sign-in-status')).toHaveText('Check your email for the sign-in link')
  return emailLink(email)
}

test('a mail scanner opening the link does not spend the token', async ({ page, goto, request }) => {
  const { email } = await createConfirmedUser(uniqueEmail('two-step'))
  await goto('/sign-in', { waitUntil: 'hydration' })
  const link = await requestMagicLink(page, email)

  // The scanner follows the link and its redirect, but never submits the form.
  const scan = await request.get(link, { maxRedirects: 0 })
  expect(scan.status()).toBe(302)
  expect(scan.headers()['location']).toMatch(/^\/auth\/confirm-link\?token_hash=[^&]+&type=email&redirect_to=%2Fwelcome$/)
  expect(scan.headers()['cache-control']).toContain('no-store')
  expect((await request.get(scan.headers()['location']!)).status()).toBe(200)

  // The signed-out user lands on the confirm page; the auth redirect leaves it alone.
  await goto(link, { waitUntil: 'hydration' })
  await expect(page).toHaveURL(/\/auth\/confirm-link\?/)
  expect(await serverSessionEmail(page)).toBeNull()

  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL('/welcome')
  expect(await serverSessionEmail(page)).toBe(email)

  // Reusing the spent link ends on the error page, not an HTTP error.
  await goto(link, { waitUntil: 'hydration' })
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(/\/auth\/error\?error=otp_expired&redirect_to=(%2F|\/)welcome$/)
  await expect(page.getByTestId('auth-error-code')).toHaveText('otp_expired')
})

// The router shows `%2F` decoded in page URLs, hence `(%2F|\/)`.
test('confirm and callback failures land on the error page', async ({ page, goto }) => {
  await goto('/auth/confirm?type=email', { waitUntil: 'hydration' })
  await expect(page).toHaveURL(/\/auth\/error\?error=invalid_request&redirect_to=(%2F|\/)$/)

  await goto(`/auth/confirm?token_hash=x&type=email&redirect_to=${encodeURIComponent('https://evil.example.com')}`, { waitUntil: 'hydration' })
  await expect(page).toHaveURL('/auth/error?error=invalid_redirect')

  await goto('/auth/callback?error=access_denied&error_description=cancelled', { waitUntil: 'hydration' })
  await expect(page).toHaveURL(/\/auth\/error\?error=access_denied&redirect_to=(%2F|\/)$/)
  await expect(page.getByTestId('auth-error-code')).toHaveText('access_denied')
})

test('the confirm route refuses cross-site form posts', async ({ request }) => {
  const response = await request.post('/auth/confirm', {
    form: { token_hash: 'x', type: 'email' },
    headers: { 'sec-fetch-site': 'cross-site' },
    maxRedirects: 0,
  })

  expect(response.status()).toBe(403)
})
