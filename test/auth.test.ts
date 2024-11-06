// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'
import { useSupabaseClient, useRuntimeConfig } from '#imports'

describe('auth', () => {
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
})
