import type { H3Event } from 'h3'
import { createError, setResponseHeaders } from 'h3'

// Browsers strip ASCII tabs and newlines before resolving a Location header, so
// `/\t/evil.com` would otherwise resolve as the protocol-relative `//evil.com`.
// Reject every C0 control and DEL rather than just CR/LF.
const hasControlCharacter = (value: string) => {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    if (code <= 0x1F || code === 0x7F) {
      return true
    }
  }
  return false
}

const hasUnsafeRedirectPrefix = (value: string) => {
  const normalized = value.toLowerCase()
  return normalized.startsWith('//') || normalized.startsWith('/\\') || normalized.startsWith('/%2f') || normalized.startsWith('/%5c')
}

export const firstQueryValue = (value: unknown) => (Array.isArray(value) ? value[0] : value)

/**
 * Whether `url` is an http(s) URL without credentials on one of `hosts`
 * (Host header values: hostname plus optional port).
 */
export const isOnHost = (url: string, hosts: string[]) => {
  if (!/^https?:\/\//i.test(url) || hasControlCharacter(url)) {
    return false
  }
  try {
    const parsed = new URL(url)
    return !parsed.username && !parsed.password && hosts.some(host => host.toLowerCase() === parsed.host)
  } catch {
    return false
  }
}

// Supabase fills `{{ .RedirectTo }}` in email templates with an absolute URL
// (the allow-listed `emailRedirectTo`/`redirectTo`, or the Site URL). One
// that points at the host this request was sent to is reduced to its path;
// every other absolute URL stays rejected. The result is a path on this site
// either way, so the host check keeps foreign URLs from being silently
// rewritten rather than guarding against an open redirect.
const sameHostPath = (value: string, hosts: string[]) => {
  if (!isOnHost(value, hosts)) {
    return value
  }
  const url = new URL(value)
  return `${url.pathname}${url.search}${url.hash}`
}

/**
 * Validates a post-auth redirect target and returns it as a relative path.
 *
 * Only same-site paths pass. With `options.host` (the request's Host header,
 * or several, e.g. with X-Forwarded-Host), an absolute http(s) URL on exactly
 * that host is accepted and reduced to its path, so email templates can pass
 * Supabase's `{{ .RedirectTo }}` through.
 */
export const getRelativeRedirectPath = (value: unknown, options: { host?: string | string[] } = {}) => {
  const rawRedirectTo = firstQueryValue(value)

  if (rawRedirectTo === undefined || rawRedirectTo === null || rawRedirectTo === '') {
    return '/'
  }

  const hosts = [options.host ?? []].flat()
  const redirectTo = typeof rawRedirectTo === 'string' ? sameHostPath(rawRedirectTo, hosts) : rawRedirectTo

  if (
    typeof redirectTo !== 'string'
    || !redirectTo.startsWith('/')
    || hasUnsafeRedirectPrefix(redirectTo)
    || redirectTo.includes('\\')
    || hasControlCharacter(redirectTo)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid redirect_to',
    })
  }

  return redirectTo
}

/**
 * The validated post-auth destination of a request. `redirect_to` is the
 * module's parameter; `next` is accepted as an alias because Supabase's email
 * template guides use it. Both go through the same validation, and a present
 * but invalid `redirect_to` never falls back to `next`.
 */
export const getRedirectTarget = (query: Record<string, unknown>, hosts: string[]) =>
  getRelativeRedirectPath(firstQueryValue(query.redirect_to) ?? firstQueryValue(query.next), { host: hosts })

/** `path` with `params` appended to its query; empty values are skipped. */
export const withQuery = (path: string, params: Record<string, string | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value)
  }
  const queryString = search.toString()
  return queryString ? `${path}${path.includes('?') ? '&' : '?'}${queryString}` : path
}

// Error codes travel in a URL to the app's error page; only pass on short
// machine-readable codes (Supabase's `otp_expired`, OAuth's `access_denied`).
const AUTH_ERROR_CODE = /^[a-z0-9_]{1,64}$/

export const authErrorCode = (value: unknown, fallback: string) => {
  const code = firstQueryValue(value)
  return typeof code === 'string' && AUTH_ERROR_CODE.test(code) ? code : fallback
}

// The same cache-prevention headers @supabase/ssr passes to `setAll` whenever
// it writes session cookies (documented on its SetAllCookies type). Using
// identical values means the order of header writes on a request never
// matters, and error responses get the same protection as cookie-carrying
// ones.
export const setAuthNoStoreHeaders = (event: H3Event) => {
  setResponseHeaders(event, {
    'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
    'Expires': '0',
    'Pragma': 'no-cache',
  })
}
