import type { EmailOtpType } from '@supabase/supabase-js'
import { createError, getQuery, sendRedirect, defineEventHandler } from 'h3'
import { supabaseServerClient } from '#supabase/server'
import { firstQueryValue, getRelativeRedirectPath, setAuthNoStoreHeaders } from './redirect'

export default defineEventHandler(async event => {
  setAuthNoStoreHeaders(event)

  const query = getQuery(event)
  const token_hash = firstQueryValue(query.token_hash) as string
  const type = firstQueryValue(query.type) as EmailOtpType | null
  const redirect_to = getRelativeRedirectPath(query.redirect_to)
  if (!token_hash || !type) {
    throw createError({ statusCode: 400, message: 'Invalid token' })
  }

  const supabase = await supabaseServerClient(event)
  const { error } = await supabase.auth.verifyOtp({ type, token_hash })

  if (error) {
    // AuthError carries the HTTP status GoTrue answered with; an expired or
    // reused token is a client error, not a 500.
    throw createError({ statusCode: error.status ?? 400, message: error.message })
  }

  await sendRedirect(event, redirect_to, 302)
})
