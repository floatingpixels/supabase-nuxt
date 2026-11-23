import type { H3Error } from 'h3'
import { defineEventHandler, getQuery } from 'h3'
import { requestClient } from '../services/supabaseServerClient'
import { authCallError, failAuthFlow, redirectAfterAuth, requestHosts } from './flow'
import { authErrorCode, firstQueryValue, getRedirectTarget, setAuthNoStoreHeaders } from './redirect'

export default defineEventHandler(async event => {
  setAuthNoStoreHeaders(event)

  const query = getQuery(event)
  let redirectTo: string
  try {
    redirectTo = getRedirectTarget(query, requestHosts(event))
  } catch (error) {
    return failAuthFlow(event, { code: 'invalid_redirect', error: error as H3Error })
  }

  const code = firstQueryValue(query.code)
  if (typeof code !== 'string' || !code) {
    // A provider that refuses (e.g. the user cancels) redirects back with
    // `error`/`error_code` instead of a code.
    return failAuthFlow(event, {
      code: authErrorCode(query.error_code ?? query.error, 'invalid_request'),
      error: { statusCode: 400, message: 'No code provided' },
      redirectTo,
    })
  }

  // With auth-js's `experimental.appendPkceFlowIdToRedirects`, the callback
  // URL names the PKCE flow whose verifier must be used for this code.
  const flowId = firstQueryValue(query.sb_flow_id)

  // Start the exchange before awaiting the session load that creating the
  // client starts. If the browser still holds a session whose refresh token
  // is dead, that load signs it out, and signing out deletes every PKCE code
  // verifier, including the one this exchange needs. The exchange reads its
  // verifier as soon as it starts, well before the refresh request can come
  // back. Both are awaited to the end, even when one of them fails, so every
  // cookie write lands before the response, and a write that fails surfaces.
  const { client: supabase, sessionLoaded } = await requestClient(event)
  const exchange = authCallError(typeof flowId === 'string' && flowId
    ? supabase.auth.exchangeCodeForSession(code, { flowId })
    : supabase.auth.exchangeCodeForSession(code))
  const [exchanged, loaded] = await Promise.allSettled([exchange, sessionLoaded])
  if (exchanged.status === 'rejected') throw exchanged.reason
  if (loaded.status === 'rejected') throw loaded.reason
  const error = exchanged.value

  if (error) {
    // AuthError carries the HTTP status GoTrue answered with; an expired or
    // reused code is a client error, not a 500.
    return failAuthFlow(event, {
      code: authErrorCode(error.code, 'auth_error'),
      error: { statusCode: error.status ?? 400, message: error.message },
      redirectTo,
    })
  }

  return redirectAfterAuth(event, redirectTo)
})
