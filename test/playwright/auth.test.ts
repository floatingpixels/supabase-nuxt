import { fileURLToPath } from 'node:url'
import { expect, test } from '@nuxt/test-utils/playwright'

test.use({
  nuxt: {
    rootDir: fileURLToPath(new URL('../../playground/', import.meta.url)),
  },
})

test('renders the login page', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  await expect(page.getByRole('heading')).toHaveText('Login')
})

test('allows logging in with user and password', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  // expect(page.getByText('<h2>Logged in as Daphnee Gleason - user1@example.com</h2>')).toBeFalsy()

  // await page.screenshot({ path: 'login.png' })
  await page.locator('input[type="email"]').fill('user1@example.com')
  await page.locator('input[type="password"]').fill('password')
  await page.getByRole('button', { name: 'Sign In with E-Mail and' }).click()
  await page.waitForSelector('pre')
  await page.reload()
  expect(page.getByText('<h2>Logged in as Daphnee Gleason - user1@example.com</h2>')).not.toBeNull()
})
