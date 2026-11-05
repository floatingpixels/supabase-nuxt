import { fileURLToPath } from 'node:url'
import { expect, test } from '@nuxt/test-utils/playwright'
import { createConfirmedUser, emailLink, serverSessionEmail, uniqueEmail } from './support'

// Two-step confirmation in an app served under a path prefix: the module's
// routes, its handoff cookie and the configured pages all live under
// app.baseURL.
const base = '/app/'

test.use({
  nuxt: {
    rootDir: fileURLToPath(new URL('../../playground/', import.meta.url)),
    nuxtConfig: { app: { baseURL: base } },
    env: {
      NUXT_PUBLIC_SUPABASE_REDIRECT_OPTIONS_CONFIRM: '/auth/confirm-link',
      NUXT_PUBLIC_SUPABASE_REDIRECT_OPTIONS_AUTH_ERROR: '/auth/error',
    },
  },
})

test('two-step confirmation works under app.baseURL', async ({ page, goto, request }) => {
  const { email } = await createConfirmedUser(uniqueEmail('base-url'))

  await goto(`${base}sign-in`, { waitUntil: 'hydration' })
  await page.locator('input[type="email"]').fill(email)
  await page.getByRole('button', { name: 'Sign In with E-Mail', exact: true }).click()
  await expect(page.getByTestId('sign-in-status')).toHaveText('Check your email for the sign-in link')

  // The templates link to {{ .SiteURL }}/auth/confirm; with a prefixed app
  // the Site URL includes the prefix.
  const link = `${base.slice(0, -1)}${await emailLink(email)}`

  const scan = await request.get(link, { maxRedirects: 0 })
  expect(scan.headers()['location']).toBe(`${base}auth/confirm-link`)
  expect(scan.headers()['set-cookie']).toContain(`Path=${base}auth/confirm`)

  await goto(link, { waitUntil: 'hydration' })
  await expect(page).toHaveURL(`${base}auth/confirm-link`)
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page).toHaveURL(`${base}welcome`)
  expect(await serverSessionEmail(page, base)).toBe(email)
})
