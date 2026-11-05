import type { H3Error } from 'h3'
import { createError, defineEventHandler, getRequestHeader, getRequestHost, readBody } from 'h3'
import { failAuthFlow, getAuthRedirectOptions, isEmailOtpType, verifyEmailLink } from './flow'
import { firstQueryValue, getRedirectTarget, setAuthNoStoreHeaders } from './redirect'

/**
 * Second step of the two-step email confirmation, enabled by
 * `redirectOptions.confirm`: the confirm page's form posts `token_hash`,
 * `type` and `redirect_to` (or `next`) here.
 */
export default defineEventHandler(async event => {
  setAuthNoStoreHeaders(event)

  if (!getAuthRedirectOptions(event).confirm) {
    throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
  }

  // Only the app's own confirm page may submit here; a cross-site form could
  // otherwise sign the visitor in to an account of the attacker's choosing.
  // Browsers send Sec-Fetch-Site on every form submission.
  const fetchSite = getRequestHeader(event, 'sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin') {
    throw createError({ statusCode: 403, statusMessage: 'Cross-site request' })
  }

  const body = await readBody<Record<string, unknown> | undefined>(event)
  const params = body && typeof body === 'object' ? body : {}

  let redirectTo: string
  try {
    redirectTo = getRedirectTarget(params, getRequestHost(event))
  } catch (error) {
    return failAuthFlow(event, { code: 'invalid_redirect', error: error as H3Error })
  }

  const token_hash = firstQueryValue(params.token_hash)
  const type = firstQueryValue(params.type)
  if (typeof token_hash !== 'string' || !token_hash || !isEmailOtpType(type)) {
    return failAuthFlow(event, {
      code: 'invalid_request',
      error: { statusCode: 400, message: 'Invalid token' },
      redirectTo,
    })
  }

  return verifyEmailLink(event, { token_hash, type, redirectTo })
})
