// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'
import { useSupabaseClient, useSupabaseUser, useRuntimeConfig } from '#imports'

describe('auth', { concurrent: false, sequential: true }, () => {
  const supabase = useSupabaseClient()

  it('has a working runtime', () => {
    const config = useRuntimeConfig().public.supabase
    const { url, key } = config
    expect(config).toBeDefined()
    expect(url).toBeDefined()
    expect(key).toBeDefined()
  })

  it('has a working client', () => {
    expect(supabase).toBeDefined()
  })

  it('can log with password', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'user1@example.com',
      password: 'password',
    })
    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data?.user).toBeDefined()
    expect(data?.session).toBeDefined()
    expect(data?.user?.email).toBe('user1@example.com')
  })

  //BUG: This test fails in vitest, but works in playwright test, probably because cookies are not set
  it.skip('can get user', async () => {
    await supabase.auth.signOut()
    let user = await useSupabaseUser()
    expect(user).toBeNull()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'user1@example.com',
      password: 'password',
    })
    expect(error).toBeNull()
    expect(data).not.toBeNull()

    const {
      data: { session },
    } = await supabase.auth.getSession()
    expect(session).not.toBeNull()

    user = await useSupabaseUser()
    expect(user).not.toBeNull()
    expect(user?.email).toBe('user1@example.com')
  })
})
