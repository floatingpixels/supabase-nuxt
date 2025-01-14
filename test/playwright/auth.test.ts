import { fileURLToPath } from 'node:url'
import { expect, test } from '@nuxt/test-utils/playwright'

test.use({
  nuxt: {
    rootDir: fileURLToPath(new URL('../../playground/', import.meta.url)),
  },
})

test('logging in with user and password', async ({ page, goto }) => {
  await goto('/login', { waitUntil: 'hydration' })

  // await page.screenshot({ path: 'login.png' })
  await page.locator('input[type="email"]').fill('user1@example.com')
  await page.locator('input[type="password"]').fill('password')
  await page.getByRole('button', { name: 'Sign In with E-Mail and' }).click()
  await page.waitForSelector('pre')
  await page.reload()
  expect(page.getByText('<h2>Logged in as Daphnee Gleason - user1@example.com</h2>')).not.toBeNull()
})

test('redirect to login page when not logged in', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'networkidle' })
  await expect(page, { message: 'module option supabase.redirect = true not working' }).toHaveURL('/login')
})

test('do not redirect when logged in', async ({ page, goto }) => {
  await goto('/login', { waitUntil: 'hydration' })

  await page.locator('input[type="email"]').fill('user1@example.com')
  await page.locator('input[type="password"]').fill('password')
  await page.getByRole('button', { name: 'Sign In with E-Mail and' }).click()
  await page.waitForSelector('pre')

  await goto('/', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL('/')
})

test('useSupabaseUser gets user data', async ({ page, goto }) => {
  await goto('/login', { waitUntil: 'hydration' })

  await page.locator('input[type="email"]').fill('user1@example.com')
  await page.locator('input[type="password"]').fill('password')
  await page.getByRole('button', { name: 'Sign In with E-Mail and' }).click()
  await page.waitForSelector('pre')

  await goto('/', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL('/')

  const userData = await page.getByTestId('user-data').textContent()
  expect(userData).toBeTruthy()
  expect(userData).toContain('"email": "user1@example.com"')
  expect(userData).toContain('"first_name": "Daphnee"')
  expect(userData).toContain('"last_name": "Gleason"')
})
