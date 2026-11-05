import { fileURLToPath } from 'node:url'
import { expect, test } from '@nuxt/test-utils/playwright'
import { adminClient, createConfirmedUser, emailLink, serverSessionEmail, signInWithPassword, uniqueEmail } from './support'

// Every email flow through the module's /auth/confirm route, end to end: the
// email is sent by the local Supabase, read from Mailpit, and its link opened
// in the browser. Each test ends with the server reading the session cookie.

test.use({
  nuxt: {
    rootDir: fileURLToPath(new URL('../../playground/', import.meta.url)),
  },
})

test('magic link signs in and lands on emailRedirectTo', async ({ page, goto }) => {
  const { email } = await createConfirmedUser(uniqueEmail('magiclink'))

  await goto('/sign-in', { waitUntil: 'hydration' })
  await page.locator('input[type="email"]').fill(email)
  await page.getByRole('button', { name: 'Sign In with E-Mail', exact: true }).click()
  await expect(page.getByTestId('sign-in-status')).toHaveText('Check your email for the sign-in link')

  // The link carries Supabase's absolute {{ .RedirectTo }}; /auth/confirm
  // accepts it because it points at the host the link is opened on.
  const link = await emailLink(email)
  expect(link).toContain('type=email')
  await goto(link, { waitUntil: 'hydration' })

  await expect(page).toHaveURL('/welcome')
  expect(await serverSessionEmail(page)).toBe(email)
})

test('invite link signs the new user in to set a password', async ({ page, goto, baseURL }) => {
  const email = uniqueEmail('invite')
  const { error } = await adminClient().auth.admin.inviteUserByEmail(email, { redirectTo: `${baseURL}account` })
  expect(error).toBeNull()

  const link = await emailLink(email)
  expect(link).toContain('type=invite')
  await goto(link, { waitUntil: 'hydration' })

  await expect(page).toHaveURL('/account')
  await expect(page.getByTestId('account-email')).toHaveText(email)

  await page.getByLabel('New password').fill('invited-password-1')
  await page.getByRole('button', { name: 'Save password' }).click()
  await expect(page.getByTestId('account-status')).toHaveText('Password updated')

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL('/sign-in')
  await signInWithPassword(page, email, 'invited-password-1')
  expect(await serverSessionEmail(page)).toBe(email)
})

test('password recovery link signs the user in to change the password', async ({ page, goto }) => {
  const { email } = await createConfirmedUser(uniqueEmail('recovery'))

  await goto('/sign-in', { waitUntil: 'hydration' })
  await page.locator('input[type="email"]').fill(email)
  await page.getByRole('button', { name: 'Send password reset link' }).click()
  await expect(page.getByTestId('sign-in-status')).toHaveText('Check your email for the password reset link')

  const link = await emailLink(email)
  expect(link).toContain('type=recovery')
  await goto(link, { waitUntil: 'hydration' })

  await expect(page).toHaveURL('/account')
  await expect(page.getByTestId('account-email')).toHaveText(email)

  await page.getByLabel('New password').fill('recovered-password-1')
  await page.getByRole('button', { name: 'Save password' }).click()
  await expect(page.getByTestId('account-status')).toHaveText('Password updated')

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL('/sign-in')
  await signInWithPassword(page, email, 'recovered-password-1')
  expect(await serverSessionEmail(page)).toBe(email)
})

test('password change from the account page checks the current password', async ({ page, goto }) => {
  const { email, password } = await createConfirmedUser(uniqueEmail('password'))

  await goto('/sign-in', { waitUntil: 'hydration' })
  await signInWithPassword(page, email, password)
  await goto('/account', { waitUntil: 'hydration' })

  await page.getByLabel('New password').fill('changed-password-1')
  await page.getByLabel('Current password').fill('not-the-password')
  await page.getByRole('button', { name: 'Save password' }).click()
  await expect(page.getByTestId('account-status')).not.toHaveText('Password updated')
  await expect(page.getByTestId('account-status')).not.toBeEmpty()

  await page.getByLabel('Current password').fill(password)
  await page.getByRole('button', { name: 'Save password' }).click()
  await expect(page.getByTestId('account-status')).toHaveText('Password updated')
})

test('email change is confirmed through /auth/confirm and the server sees the new address', async ({ page, goto, request }) => {
  const { email, password } = await createConfirmedUser(uniqueEmail('change-old'))
  const newEmail = uniqueEmail('change-new')

  await goto('/sign-in', { waitUntil: 'hydration' })
  await signInWithPassword(page, email, password)
  await goto('/account', { waitUntil: 'hydration' })

  await page.getByLabel('New email').fill(newEmail)
  await page.getByRole('button', { name: 'Change email' }).click()
  await expect(page.getByTestId('account-status')).toHaveText('Check both inboxes to confirm the change')

  // Secure email change (`double_confirm_changes`) mails both addresses.
  const oldAddressLink = await emailLink(email)
  const newAddressLink = await emailLink(newEmail)
  expect(oldAddressLink).toContain('type=email_change')
  expect(newAddressLink).toContain('type=email_change')

  await goto(newAddressLink, { waitUntil: 'hydration' })
  await expect(page).toHaveURL('/account')
  await expect(page.getByTestId('account-email')).toHaveText(newEmail)
  expect(await serverSessionEmail(page)).toBe(newEmail)

  // Upstream behaviour as of the local GoTrue in Supabase CLI 3.0.0
  // (2026-11-05): the first confirmed link completes the change, and the
  // other address's link is then spent. If GoTrue starts requiring both
  // links, this flips to a redirect, and the README note needs updating.
  const secondLink = await request.get(oldAddressLink, { maxRedirects: 0 })
  expect(secondLink.status()).toBe(403)
})
