import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import { setup, $fetch, createPage } from '@nuxt/test-utils/e2e'

describe('ssr', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
  })

  it('renders the index page', async () => {
    // Get response to a server-rendered page with `$fetch`.
    const html = await $fetch('/')
    expect(html).toContain('<h2>User</h2>')
  })

  it('signs in with e-mail', async () => {
    const page = await createPage('/login')
    await page.getByRole('textbox').fill('stefan@standa.de')
    await page.getByRole('button', { name: 'Sign In with E-Mail' }).click()
    // await page.screenshot({ path: 'test.png' })
  })
})
