// @vitest-environment nuxt
import { beforeAll, describe, expect, it } from 'vitest'
import { setup } from '@nuxt/test-utils'
import { useRuntimeConfig } from '#imports'

describe('runtime', () => {
  beforeAll(async () => {
    await setup()
  })

  it('has values from .env', () => {
    const config = useRuntimeConfig().public.supabase
    const { url, anonKey } = config
    expect(config).toBeDefined()
    expect(url).toBeDefined()
    expect(url).toBe('http://127.0.0.1:54321')
    expect(anonKey).toBeDefined()
    expect(anonKey).toBe(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
    )
  })
})
