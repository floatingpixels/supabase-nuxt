// @vitest-environment nuxt
import { beforeAll, describe, expect, it } from 'vitest'
import { setup } from '@nuxt/test-utils'
import { useRuntimeConfig } from '#imports'

describe('runtime', () => {
  beforeAll(async () => {
    await setup()
  })

  it('reads url from .env', () => {
    const config = useRuntimeConfig().public.supabase
    const { url } = config
    expect(config).toBeDefined()
    expect(url).toBeDefined()
    expect(url).toBe('http://127.0.0.1:54321')
  })

  it('reads anonKey from .env', () => {
    const config = useRuntimeConfig().public.supabase
    const { anonKey } = config
    expect(config).toBeDefined()
    expect(anonKey).toBeDefined()
    expect(anonKey).toBe(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    )
  })

  it('reads serviceRoleKey from .env', () => {
    const config = useRuntimeConfig().supabase
    const { serviceRoleKey } = config
    expect(config).toBeDefined()
    expect(serviceRoleKey).toBeDefined()
    expect(serviceRoleKey).toBe(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
    )
  })
})
