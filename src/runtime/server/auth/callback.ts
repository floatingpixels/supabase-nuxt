import { defineEventHandler, createError, getQuery, sendRedirect } from 'h3'
import { supabaseServerClient } from '#supabase/server'
import { firstQueryValue, getRelativeRedirectPath, setAuthNoStoreHeaders } from './redirect'

export default defineEventHandler(async event => {
  setAuthNoStoreHeaders(event)

  const query = getQuery(event)
  const code = firstQueryValue(query.code) as string
  const redirect_to = getRelativeRedirectPath(query.redirect_to)

  if (!code) {
    throw createError({ statusCode: 400, message: 'No code provided' })
  }
  const supabase = await supabaseServerClient(event)
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    // AuthError carries the HTTP status GoTrue answered with; an expired or
    // reused code is a client error, not a 500.
    throw createError({ statusCode: error.status ?? 400, message: error.message })
  }

  await sendRedirect(event, redirect_to, 302)
})
