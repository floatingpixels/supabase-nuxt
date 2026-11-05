import { createClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'

// Helpers for the account-flow tests: fixture users through the admin API and
// email links read from the local stack's Mailpit (`supabase status`).

const mailpitUrl = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324'

export const adminClient = () =>
  createClient(process.env.NUXT_PUBLIC_SUPABASE_URL!, process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

/** A fresh address per test, so parallel tests never share users or mail. */
export const uniqueEmail = (label: string) =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`

export const createConfirmedUser = async (email: string, password = 'initial-password-1') => {
  const { error } = await adminClient().auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  return { email, password }
}

type MailpitSummary = { ID: string, Subject: string }

/**
 * The /auth/confirm link of the newest email to `to`, as a path relative to
 * the app (templates use the Site URL, the tests run on a random port).
 */
export const emailLink = async (to: string, { timeout = 15_000 } = {}) => {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const search = await fetch(`${mailpitUrl}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`)
    const { messages } = (await search.json()) as { messages: MailpitSummary[] }
    if (messages.length > 0) {
      const message = await fetch(`${mailpitUrl}/api/v1/message/${messages[0]!.ID}`)
      const { HTML } = (await message.json()) as { HTML: string }
      const href = HTML.match(/href="([^"]*\/auth\/confirm\?[^"]*)"/)?.[1]
      if (!href) throw new Error(`No /auth/confirm link in the email to ${to}`)
      const url = new URL(href.replaceAll('&amp;', '&'))
      return `${url.pathname}${url.search}`
    }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error(`No email to ${to} within ${timeout} ms`)
}

/** The user the server sees for the browser's session cookies. */
export const serverSessionEmail = async (page: Page) =>
  page.evaluate(async () => {
    const { user } = await fetch('/api/session').then(response => response.json()) as { user: { email: string } | null }
    return user?.email ?? null
  })

export const signInWithPassword = async (page: Page, email: string, password: string) => {
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: 'Sign In with E-Mail and Password' }).click()
  await page.locator('#authResponse').filter({ hasText: email }).waitFor()
}
