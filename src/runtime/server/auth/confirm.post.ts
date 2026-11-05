import { createError, defineEventHandler, getRequestHeader } from 'h3'
import { failAuthFlow, getAuthRedirectOptions, parseEmailLink, requestHosts, takeParkedEmailLink, verifyEmailLink } from './flow'
import { isOnHost, setAuthNoStoreHeaders } from './redirect'

/**
 * Second step of the two-step email confirmation, enabled by
 * `redirectOptions.confirm`: the confirm page's form posts here (no fields),
 * and the email link parked in a cookie by `GET /auth/confirm` is verified.
 */
export default defineEventHandler(async event => {
  setAuthNoStoreHeaders(event)

  if (!getAuthRedirectOptions(event).confirm) {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  // Only the app's own confirm page may submit here; a cross-site form could
  // otherwise sign the visitor in to an account of the attacker's choosing.
  // Current browsers send Sec-Fetch-Site on every form submission; older ones
  // still send Origin on cross-origin POSTs. A request with neither comes
  // from a non-browser client, which can't be used for login CSRF.
  const fetchSite = getRequestHeader(event, 'sec-fetch-site')
  const origin = getRequestHeader(event, 'origin')
  const isCrossSite = fetchSite
    ? fetchSite !== 'same-origin'
    // `Origin: null` (sandboxed or privacy-redirected documents) never matches.
    : origin !== undefined && !isOnHost(origin, requestHosts(event))
  if (isCrossSite) {
    throw createError({ statusCode: 403, statusMessage: 'Cross-site request' })
  }

  const params = takeParkedEmailLink(event)
  if (!params) {
    // Older than the cookie's 10 minutes, already submitted, or opened in
    // another browser: the user needs a new link, as for a spent token.
    return failAuthFlow(event, {
      code: 'otp_expired',
      error: { statusCode: 400, message: 'Email link expired or already used' },
    })
  }

  const parsed = parseEmailLink(event, params)
  if ('failure' in parsed) return parsed.failure

  return verifyEmailLink(event, parsed.link)
})
