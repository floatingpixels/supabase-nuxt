import { AuthApiError, AuthSessionMissingError } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useSupabaseClient = vi.fn()

vi.mock('../../src/runtime/composables/useSupabaseClient', () => ({
  useSupabaseClient,
}))

describe('useSupabaseUser', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns null when there are no claims and no auth error', async () => {
    useSupabaseClient.mockReturnValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
        getUser: vi.fn(),
      },
    })

    const { useSupabaseUser } = await import('../../src/runtime/composables/useSupabaseUser')
    const result = await useSupabaseUser()

    expect(result).toEqual({
      data: null,
      error: null,
    })
  })

  it('returns a normalized user directly from claims when claims are sufficient', async () => {
    const getUser = vi.fn()
    useSupabaseClient.mockReturnValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: {
            claims: {
              sub: 'user-1',
              email: 'user@example.com',
              role: 'authenticated',
              aud: 'authenticated',
              app_metadata: { provider: 'email' },
              user_metadata: { user_name: 'Tester' },
            },
          },
          error: null,
        }),
        getUser,
      },
    })

    const { useSupabaseUser } = await import('../../src/runtime/composables/useSupabaseUser')
    const result = await useSupabaseUser()

    expect(getUser).not.toHaveBeenCalled()
    expect(result).toEqual({
      data: {
        id: 'user-1',
        email: 'user@example.com',
        phone: undefined,
        role: 'authenticated',
        aud: 'authenticated',
        app_metadata: { provider: 'email' },
        user_metadata: { user_name: 'Tester' },
        claims: {
          sub: 'user-1',
          email: 'user@example.com',
          role: 'authenticated',
          aud: 'authenticated',
          app_metadata: { provider: 'email' },
          user_metadata: { user_name: 'Tester' },
        },
      },
      error: null,
    })
  })

  it('falls back to getUser when claims are sparse', async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: {
        user: {
          id: 'user-2',
          email: 'fallback@example.com',
          phone: '+491234',
          role: 'authenticated',
          aud: 'authenticated',
          app_metadata: { provider: 'email' },
          user_metadata: { first_name: 'Fallback' },
        },
      },
      error: null,
    })
    useSupabaseClient.mockReturnValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: {
            claims: {
              sub: 'user-2',
            },
          },
          error: null,
        }),
        getUser,
      },
    })

    const { useSupabaseUser } = await import('../../src/runtime/composables/useSupabaseUser')
    const result = await useSupabaseUser()

    expect(getUser).toHaveBeenCalledTimes(1)
    expect(result.data).toMatchObject({
      id: 'user-2',
      email: 'fallback@example.com',
      phone: '+491234',
      role: 'authenticated',
      aud: 'authenticated',
      app_metadata: { provider: 'email' },
      user_metadata: { first_name: 'Fallback' },
      claims: { sub: 'user-2' },
    })
    expect(result.error).toBeNull()
  })

  it('propagates auth errors from claims lookup', async () => {
    const claimsError = new Error('claims failed')
    useSupabaseClient.mockReturnValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: null,
          error: claimsError,
        }),
        getUser: vi.fn(),
      },
    })

    const { useSupabaseUser } = await import('../../src/runtime/composables/useSupabaseUser')
    const result = await useSupabaseUser()

    expect(result).toEqual({
      data: null,
      error: claimsError,
    })
  })

  it('returns auth errors thrown under auth.throwOnError instead of throwing them', async () => {
    const sessionMissing = new AuthSessionMissingError()
    const userError = new AuthApiError('User not found', 404, 'user_not_found')
    useSupabaseClient.mockReturnValueOnce({
      auth: { getClaims: vi.fn().mockRejectedValue(sessionMissing), getUser: vi.fn() },
    })
    useSupabaseClient.mockReturnValueOnce({
      auth: {
        // Claims without email/metadata make the composable ask for the user.
        getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: 'user-id' } }, error: null }),
        getUser: vi.fn().mockRejectedValue(userError),
      },
    })

    const { useSupabaseUser } = await import('../../src/runtime/composables/useSupabaseUser')

    expect(await useSupabaseUser()).toEqual({ data: null, error: sessionMissing })
    expect(await useSupabaseUser()).toEqual({ data: null, error: userError })
  })

  it('still throws errors that are not auth errors, e.g. an unknown signing algorithm', async () => {
    // auth-js 2.119 throws a plain Error for a JWT alg it cannot verify (such
    // as EdDSA); treating that as signed out would loop through the login page.
    useSupabaseClient.mockReturnValue({
      auth: { getClaims: vi.fn().mockRejectedValue(new Error('Invalid alg claim')), getUser: vi.fn() },
    })

    const { useSupabaseUser } = await import('../../src/runtime/composables/useSupabaseUser')

    await expect(useSupabaseUser()).rejects.toThrow('Invalid alg claim')
  })
})
