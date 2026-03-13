import type { User, AuthError } from '@supabase/supabase-js'
import { useSupabaseClient } from './useSupabaseClient'

export interface SupabaseAuthUser {
  id: string
  email?: string
  phone?: string
  role?: string
  aud?: string
  app_metadata: User['app_metadata']
  user_metadata: User['user_metadata']
  claims: Record<string, unknown>
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const normalizeUser = ({
  claims,
  user,
}: {
  claims: Record<string, unknown>
  user?: User | null
}): SupabaseAuthUser | null => {
  const claimUserId = typeof claims.sub === 'string' ? claims.sub : undefined
  const userId = user?.id ?? claimUserId

  if (!userId) {
    return null
  }

  const claimAppMetadata = isRecord(claims.app_metadata) ? claims.app_metadata : {}
  const claimUserMetadata = isRecord(claims.user_metadata) ? claims.user_metadata : {}

  return {
    id: userId,
    email: user?.email ?? (typeof claims.email === 'string' ? claims.email : undefined),
    phone: user?.phone ?? (typeof claims.phone === 'string' ? claims.phone : undefined),
    role: user?.role ?? (typeof claims.role === 'string' ? claims.role : undefined),
    aud: user?.aud ?? (typeof claims.aud === 'string' ? claims.aud : undefined),
    app_metadata: user?.app_metadata ?? claimAppMetadata,
    user_metadata: user?.user_metadata ?? claimUserMetadata,
    claims,
  }
}

const needsUserFallback = (claims: Record<string, unknown>) => {
  return !isRecord(claims.app_metadata) || !isRecord(claims.user_metadata) || typeof claims.email !== 'string'
}

export const useSupabaseUser = async (): Promise<{ data: SupabaseAuthUser | null, error: AuthError | null }> => {
  const supabase = useSupabaseClient()

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()

  if (claimsError) {
    return { data: null, error: claimsError }
  }

  const claims = claimsData?.claims
  if (!claims || !isRecord(claims)) {
    return { data: null, error: null }
  }

  if (!needsUserFallback(claims)) {
    return { data: normalizeUser({ claims }), error: null }
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    return { data: null, error: userError }
  }

  return { data: normalizeUser({ claims, user: userData.user }), error: null }
}
