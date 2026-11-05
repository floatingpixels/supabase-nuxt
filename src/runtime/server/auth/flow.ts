import type { EmailOtpType } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { createError, sendRedirect } from 'h3'
import { useRuntimeConfig } from '#imports'
import { supabaseServerClient } from '#supabase/server'
import { authErrorCode, getRelativeRedirectPath, withQuery } from './redirect'

const EMAIL_OTP_TYPES = new Set<string>(['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'])

export const isEmailOtpType = (value: unknown): value is EmailOtpType =>
  typeof value === 'string' && EMAIL_OTP_TYPES.has(value)

export const getAuthRedirectOptions = (event: H3Event) => {
  const { confirm, authError } = useRuntimeConfig(event).public.supabase.redirectOptions ?? {}
  return { confirm: confirm || undefined, authError: authError || undefined }
}

// A redirect answering a POST must turn it into a GET of the target.
const redirectStatus = (event: H3Event) => (event.method === 'POST' ? 303 : 302)

export const redirectAfterAuth = (event: H3Event, path: string) =>
  sendRedirect(event, path, redirectStatus(event))

type AuthFailure = {
  /** Short code for the error page's `error` query parameter. */
  code: string
  /** The error thrown when no error page is configured. */
  error: Parameters<typeof createError>[0]
  /** A validated destination the error page can offer to continue to. */
  redirectTo?: string
}

/**
 * Ends a failed auth flow. Without `redirectOptions.authError` the error is
 * thrown as before; with it, the user lands on that page with `?error=<code>`
 * (plus `redirect_to` when the link carried a valid one).
 */
export const failAuthFlow = async (event: H3Event, { code, error, redirectTo }: AuthFailure) => {
  const { authError } = getAuthRedirectOptions(event)
  if (!authError) {
    throw createError(error)
  }
  // Returned, not just awaited: on h3 v2 (Nuxt 5) sendRedirect only builds
  // the response.
  return sendRedirect(
    event,
    withQuery(getRelativeRedirectPath(authError), { error: code, redirect_to: redirectTo }),
    redirectStatus(event),
  )
}

/** Verifies an email link's token hash and redirects to `redirectTo`. */
export const verifyEmailLink = async (
  event: H3Event,
  { token_hash, type, redirectTo }: { token_hash: string, type: EmailOtpType, redirectTo: string },
) => {
  const supabase = await supabaseServerClient(event)
  const { error } = await supabase.auth.verifyOtp({ type, token_hash })

  if (error) {
    // AuthError carries the HTTP status GoTrue answered with; an expired or
    // reused token is a client error, not a 500.
    return failAuthFlow(event, {
      code: authErrorCode(error.code, 'auth_error'),
      error: { statusCode: error.status ?? 400, message: error.message },
      redirectTo,
    })
  }

  return redirectAfterAuth(event, redirectTo)
}
