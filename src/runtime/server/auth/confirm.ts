import type { EmailOtpType } from '@supabase/supabase-js'
import { createError, getQuery, sendRedirect, defineEventHandler } from 'h3'
import { supabaseServerClient } from '#supabase/server'
import { getRelativeRedirectPath, setAuthNoStoreHeaders } from './redirect'

export default defineEventHandler(async event => {
  setAuthNoStoreHeaders(event)

  const query = getQuery(event)
  const token_hash = query.token_hash as string
  const type = query.type as EmailOtpType | null
  const redirect_to = getRelativeRedirectPath(query.redirect_to)
  if (!token_hash || !type) {
    throw createError({ statusMessage: 'Invalid token' })
  }

  const supabase = await supabaseServerClient(event)
  const { error } = await supabase.auth.verifyOtp({ type, token_hash })

  if (error) {
    throw createError({ statusMessage: error.message })
  }

  setAuthNoStoreHeaders(event)
  await sendRedirect(event, redirect_to, 302)
})
