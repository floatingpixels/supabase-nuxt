import type { H3Error } from 'h3'
import { getQuery, getRequestHost, sendRedirect, defineEventHandler } from 'h3'
import { failAuthFlow, getAuthRedirectOptions, isEmailOtpType, verifyEmailLink } from './flow'
import { firstQueryValue, getRedirectTarget, getRelativeRedirectPath, setAuthNoStoreHeaders, withQuery } from './redirect'

export default defineEventHandler(async event => {
  setAuthNoStoreHeaders(event)

  const query = getQuery(event)
  let redirectTo: string
  try {
    redirectTo = getRedirectTarget(query, getRequestHost(event))
  } catch (error) {
    return failAuthFlow(event, { code: 'invalid_redirect', error: error as H3Error })
  }

  const token_hash = firstQueryValue(query.token_hash)
  const type = firstQueryValue(query.type)
  if (typeof token_hash !== 'string' || !token_hash || !isEmailOtpType(type)) {
    return failAuthFlow(event, {
      code: 'invalid_request',
      error: { statusCode: 400, message: 'Invalid token' },
      redirectTo,
    })
  }

  // Two-step confirmation: a GET only hands the link over to the app's
  // confirm page, whose button POSTs back here. Mail scanners that open links
  // (e.g. Outlook Safe Links) then can't consume the one-time token.
  const { confirm } = getAuthRedirectOptions(event)
  if (confirm) {
    return sendRedirect(
      event,
      withQuery(getRelativeRedirectPath(confirm), { token_hash, type, redirect_to: redirectTo }),
      302,
    )
  }

  return verifyEmailLink(event, { token_hash, type, redirectTo })
})
