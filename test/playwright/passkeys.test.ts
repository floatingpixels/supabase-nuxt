import { fileURLToPath } from 'node:url'
import { expect, test } from '@nuxt/test-utils/playwright'
import { createConfirmedUser, serverSessionEmail, signInWithPassword, uniqueEmail } from './support'

// Passkeys with a virtual WebAuthn authenticator (Chromium's DevTools
// protocol). WebAuthn checks the page origin against the relying party, so the
// app runs on the fixed port listed in supabase/config.toml and is opened via
// `localhost`, the configured RP ID.
const PORT = 3100
const origin = `http://localhost:${PORT}`

// The fixture's `goto` targets 127.0.0.1, so open pages on `localhost` and wait
// for hydration the way it does.
const open = async (page: import('@playwright/test').Page, path: string) => {
  await page.goto(`${origin}${path}`)
  await page.waitForFunction(() => (window as unknown as { useNuxtApp?: () => { isHydrating: boolean } }).useNuxtApp?.().isHydrating === false)
}

test.skip(({ browserName }) => browserName !== 'chromium', 'virtual authenticators need the Chromium DevTools protocol')

test.use({
  nuxt: {
    rootDir: fileURLToPath(new URL('../../playground/', import.meta.url)),
    port: PORT,
  },
})

test('register, rename, sign in with and delete a passkey', async ({ page }) => {
  const { email, password } = await createConfirmedUser(uniqueEmail('passkey'))

  const cdp = await page.context().newCDPSession(page)
  await cdp.send('WebAuthn.enable')
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  })

  await open(page, '/sign-in')
  await signInWithPassword(page, email, password)

  await open(page, '/account')
  await page.getByRole('button', { name: 'Register a passkey' }).click()
  await expect(page.getByTestId('account-status')).toHaveText('Passkey registered')
  await expect(page.getByTestId('passkey')).toHaveCount(1)

  await page.getByLabel('Passkey name').fill('Test laptop')
  await page.getByRole('button', { name: 'Rename' }).click()
  await expect(page.getByTestId('passkey-name')).toHaveText('Test laptop')

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(`${origin}/sign-in`)
  expect(await serverSessionEmail(page)).toBeNull()

  // Discoverable credential: no email needed.
  await page.getByRole('button', { name: 'Sign in with a passkey' }).click()
  await expect(page).toHaveURL(`${origin}/account`)
  expect(await serverSessionEmail(page)).toBe(email)
  await page.reload()
  await expect(page.getByTestId('account-email')).toHaveText(email)

  await expect(page.getByTestId('passkey')).toHaveCount(1)
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByTestId('passkey')).toHaveCount(0)
})
