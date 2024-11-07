import { fileURLToPath } from 'node:url'
import { expect, test } from '@nuxt/test-utils/playwright'

test.use({
  nuxt: {
    rootDir: fileURLToPath(new URL('../../playground/', import.meta.url)),
  },
})

test('data fetching from browser', async ({ page, goto }) => {
  await goto('/login', { waitUntil: 'hydration' })

  // await page.screenshot({ path: 'login.png' })
  await page.locator('input[type="email"]').fill('user1@example.com')
  await page.locator('input[type="password"]').fill('password')
  await page.getByRole('button', { name: 'Sign In with E-Mail and' }).click()
  await page.waitForSelector('pre')

  await goto('/', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL('/')
  expect(page.getByTestId('client-data')).toBeTruthy()
})

test('data fetching from server', async ({ page, goto }) => {
  await goto('/login', { waitUntil: 'hydration' })

  // await page.screenshot({ path: 'login.png' })
  await page.locator('input[type="email"]').fill('user1@example.com')
  await page.locator('input[type="password"]').fill('password')
  await page.getByRole('button', { name: 'Sign In with E-Mail and' }).click()
  await page.waitForSelector('pre')

  await goto('/', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL('/')
  const serverData = await page.getByTestId('server-data').textContent()
  const clientData = await page.getByTestId('client-data').textContent()
  expect(serverData).toBeTruthy()
  expect(clientData).toBeTruthy()
  expect(serverData).toMatch(clientData!)
})

test('rls policies are applied on select', async ({ page, goto }) => {
  await goto('/login', { waitUntil: 'hydration' })

  // await page.screenshot({ path: 'login.png' })
  await page.locator('input[type="email"]').fill('user1@example.com')
  await page.locator('input[type="password"]').fill('password')
  await page.getByRole('button', { name: 'Sign In with E-Mail and' }).click()
  await page.waitForSelector('pre')

  await goto('/rls', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL('/rls')
  expect(page.getByTestId('member-data')).toBeTruthy()

  const data = await page.getByTestId('member-data').textContent()
  expect(data).toBeTruthy()
  const jsonData = JSON.parse(data!)
  expect(jsonData).toHaveLength(1)
  expect(jsonData[0]).toMatchObject({ username: 'user1' })
})
