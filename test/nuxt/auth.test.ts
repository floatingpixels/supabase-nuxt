// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import { useSupabaseClient, useSupabaseUser, useRuntimeConfig } from '#imports'

async function runInNuxtContext<T>(factory: () => Promise<T> | T) {
  let result!: T

  await mountSuspended(defineComponent({
    async setup() {
      result = await factory()
      return () => h('div')
    },
  }))

  return result
}

describe('auth', () => {
  it('has a working runtime', async () => {
    const config = await runInNuxtContext(() => useRuntimeConfig().public.supabase)
    const { url, publishableKey } = config

    expect(config).toBeDefined()
    expect(url).toBeDefined()
    expect(publishableKey).toBeDefined()
  })

  it('has a working client', async () => {
    const supabase = await runInNuxtContext(() => useSupabaseClient())

    expect(supabase).toBeDefined()
  })

  it('can log with password', async () => {
    const supabase = await runInNuxtContext(() => useSupabaseClient())
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

  it('does not return data when signed out', async () => {
    const supabase = await runInNuxtContext(() => useSupabaseClient())
    await supabase.auth.signOut()

    const { data, error } = await runInNuxtContext(() => useSupabaseUser())

    expect(data).toBeNull()
    expect(error).toBeNull()
  })

  it('can get user', async () => {
    const supabase = await runInNuxtContext(() => useSupabaseClient())
    await supabase.auth.signOut()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'user1@example.com',
      password: 'password',
    })

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data).not.toBeUndefined()

    const {
      data: { session },
    } = await supabase.auth.getSession()
    expect(session).not.toBeNull()

    const { data: user, error: compError } = await runInNuxtContext(() => useSupabaseUser())

    expect(compError).toBeNull()
    expect(user).not.toBeNull()
    expect(user?.id).toBeTruthy()
    expect(user?.email).toBe('user1@example.com')
    expect(user?.claims.sub).toBe(user?.id)
    expect(user?.user_metadata).toBeDefined()
    expect(user?.app_metadata).toBeDefined()
  })
})
