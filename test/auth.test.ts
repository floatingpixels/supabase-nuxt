// @vitest-environment nuxt
import { beforeAll, describe, expect, it } from 'vitest'
import { setup } from '@nuxt/test-utils/e2e'
import { useSupabaseClient, useSupabaseUser, useRuntimeConfig } from '#imports'

describe('auth', { concurrent: false, sequential: true }, () => {
  const supabase = useSupabaseClient()

  beforeAll(async () => {
    await setup()
  })

  describe('supabase', () => {
    it('has a working runtime', () => {
      const config = useRuntimeConfig().public.supabase
      const { url, publishableKey } = config
      expect(config).toBeDefined()
      expect(url).toBeDefined()
      expect(publishableKey).toBeDefined()
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

  describe('useSupabaseUser', () => {
    it('does not return data when signed out', async () => {
      await supabase.auth.signOut()
      const { data, error } = await useSupabaseUser()
      expect(data).toBeUndefined()
      expect(error).toBeNull()
    })

    it('can get user', async () => {
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

      const { data: user, error: compError } = await useSupabaseUser()
      expect(compError).toBeNull()
      expect(user).not.toBeNull()
      expect(user?.email).toBe('user1@example.com')
    })
  })
})
