import { getQuery, sendRedirect, defineEventHandler } from 'h3'
import { getAuthRedirectOptions, parkEmailLink, parseEmailLink, verifyEmailLink, withAppBase } from './flow'
import { setAuthNoStoreHeaders } from './redirect'

export default defineEventHandler(async event => {
  setAuthNoStoreHeaders(event)

  const parsed = parseEmailLink(event, getQuery(event))
  if ('failure' in parsed) return parsed.failure
  const { link } = parsed

  // Two-step confirmation: a GET only parks the link in a cookie and opens the
  // app's confirm page, whose button POSTs back here. Mail scanners that open
  // links (e.g. Outlook Safe Links) then can't consume the one-time token, and
  // the token never appears in the page's URL.
  const { confirm } = getAuthRedirectOptions(event)
  if (confirm) {
    parkEmailLink(event, link)
    return sendRedirect(event, withAppBase(event, confirm), 302)
  }

  return verifyEmailLink(event, link)
})
