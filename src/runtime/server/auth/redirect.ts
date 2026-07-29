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

export const getRelativeRedirectPath = (value: unknown) => {
  const redirectTo = firstQueryValue(value)

  if (redirectTo === undefined || redirectTo === null || redirectTo === '') {
    return '/'
  }

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
