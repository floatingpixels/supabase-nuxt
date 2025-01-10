// @vitest-environment nuxt
import { beforeAll, describe, expect, it } from 'vitest'
import { setup } from '@nuxt/test-utils/e2e'
import { useSupabaseClient, useSupabaseUser, useRuntimeConfig } from '#imports'

describe('auth', { concurrent: false, sequential: true }, () => {
  const supabase = useSupabaseClient()

  beforeAll(async () => {
    await setup()
  })

  it('has a working runtime', () => {
    const config = useRuntimeConfig().public.supabase
    const { url, anonKey } = config
    expect(config).toBeDefined()
    expect(url).toBeDefined()
    expect(anonKey).toBeDefined()
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

  it('can get user', async () => {
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
