import type { H3Error } from 'h3'
import { defineEventHandler, getQuery, getRequestHost } from 'h3'
import { supabaseServerClient } from '#supabase/server'
import { failAuthFlow, redirectAfterAuth } from './flow'
import { authErrorCode, firstQueryValue, getRedirectTarget, setAuthNoStoreHeaders } from './redirect'

export default defineEventHandler(async event => {
  setAuthNoStoreHeaders(event)

  const query = getQuery(event)
  let redirectTo: string
  try {
    redirectTo = getRedirectTarget(query, getRequestHost(event))
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
  const supabase = await supabaseServerClient(event)
  const { error } = typeof flowId === 'string' && flowId
    ? await supabase.auth.exchangeCodeForSession(code, { flowId })
    : await supabase.auth.exchangeCodeForSession(code)

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
