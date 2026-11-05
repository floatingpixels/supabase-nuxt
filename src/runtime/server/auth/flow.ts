import type { EmailOtpType } from '@supabase/supabase-js'
import type { H3Error, H3Event } from 'h3'
import { createError, deleteCookie, getCookie, getRequestHost, getRequestProtocol, sendRedirect, setCookie } from 'h3'
import { useRuntimeConfig } from '#imports'
import { supabaseServerClient } from '#supabase/server'
import { authErrorCode, firstQueryValue, getRedirectTarget, withQuery } from './redirect'

const EMAIL_OTP_TYPES = new Set<string>(['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'])

export const isEmailOtpType = (value: unknown): value is EmailOtpType =>
  typeof value === 'string' && EMAIL_OTP_TYPES.has(value)

/**
 * The hosts this request was addressed to: the Host header and, behind a
 * proxy that rewrites it, X-Forwarded-Host. Only used to recognise absolute
 * URLs pointing at this site; every redirect stays a relative path.
 */
export const requestHosts = (event: H3Event) =>
  [...new Set([getRequestHost(event), getRequestHost(event, { xForwardedHost: true })])]

// `confirm` and `authError` are app pages: a relative path, optionally with a
// query, never a URL or a fragment.
const configuredPage = (name: string, value: string | undefined) => {
  if (!value) return undefined
  if (!value.startsWith('/') || /^\/[/\\]/.test(value) || value.includes('#')) {
    throw createError({
      statusCode: 500,
      statusMessage: `Invalid supabase.redirectOptions.${name}: expected a path such as /auth/error, got "${value}"`,
    })
  }
  return value
}

export const getAuthRedirectOptions = (event: H3Event) => {
  const { confirm, authError } = useRuntimeConfig(event).public.supabase.redirectOptions ?? {}
  return {
    confirm: configuredPage('confirm', confirm),
    authError: configuredPage('authError', authError),
  }
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
  /** The link's validated destination (`/` when it named none). */
  redirectTo?: string
}

/**
 * Ends a failed auth flow. Without `redirectOptions.authError` the error is
 * thrown as before; with it, the user lands on that page with `?error=<code>`
 * and the link's validated `redirect_to` (omitted when it was invalid).
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
    withQuery(authError, { error: code, redirect_to: redirectTo }),
    redirectStatus(event),
  )
}

type EmailLink = { token_hash: string, type: EmailOtpType, redirectTo: string }

/**
 * The fields of an email link, from the GET query or the confirm page's POST
 * body. Invalid links end the flow: `{ failure }` holds the handler's result.
 */
export const parseEmailLink = (
  event: H3Event,
  params: Record<string, unknown>,
): { link: EmailLink } | { failure: ReturnType<typeof failAuthFlow> } => {
  let redirectTo: string
  try {
    redirectTo = getRedirectTarget(params, requestHosts(event))
  } catch (error) {
    return { failure: failAuthFlow(event, { code: 'invalid_redirect', error: error as H3Error }) }
  }

  const token_hash = firstQueryValue(params.token_hash)
  const type = firstQueryValue(params.type)
  if (typeof token_hash !== 'string' || !token_hash || !isEmailOtpType(type)) {
    return {
      failure: failAuthFlow(event, {
        code: 'invalid_request',
        error: { statusCode: 400, message: 'Invalid token' },
        redirectTo,
      }),
    }
  }

  return { link: { token_hash, type, redirectTo } }
}

// Two-step confirmation keeps the unspent token out of the confirm page's
// URL, where analytics, error trackers and browser history would record a
// working sign-in link: GET /auth/confirm parks the link in this cookie, and
// the page's POST back to /auth/confirm spends it. The path keeps it away from
// every other request (the confirm page included), and SameSite=Lax keeps it
// off cross-site POSTs.
const CONFIRM_COOKIE = 'supabase-nuxt-confirm'
const CONFIRM_COOKIE_MAX_AGE = 10 * 60

const confirmCookieOptions = (event: H3Event) => ({
  path: '/auth/confirm',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: getRequestProtocol(event) === 'https',
})

export const parkEmailLink = (event: H3Event, { token_hash, type, redirectTo }: EmailLink) => {
  setCookie(
    event,
    CONFIRM_COOKIE,
    new URLSearchParams({ token_hash, type, redirect_to: redirectTo }).toString(),
    { ...confirmCookieOptions(event), maxAge: CONFIRM_COOKIE_MAX_AGE },
  )
}

/**
 * The email link parked by `parkEmailLink`, as link fields. The cookie is
 * cleared right away, so each link can be submitted once whatever the
 * outcome. Missing (expired, already used, another browser): `undefined`.
 */
export const takeParkedEmailLink = (event: H3Event) => {
  const value = getCookie(event, CONFIRM_COOKIE)
  if (value === undefined) return undefined
  deleteCookie(event, CONFIRM_COOKIE, confirmCookieOptions(event))
  return Object.fromEntries(new URLSearchParams(value))
}

/** Verifies an email link's token hash and redirects to `redirectTo`. */
export const verifyEmailLink = async (event: H3Event, { token_hash, type, redirectTo }: EmailLink) => {
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
