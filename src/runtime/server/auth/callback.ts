import { defineEventHandler, createError, getQuery, sendRedirect } from 'h3'
import { supabaseServerClient } from '#supabase/server'
import { getRelativeRedirectPath, setAuthNoStoreHeaders } from './redirect'

export default defineEventHandler(async event => {
  setAuthNoStoreHeaders(event)

  const query = getQuery(event)
  const code = query.code as string
  const redirect_to = getRelativeRedirectPath(query.redirect_to)

  if (!code) {
    throw createError({ statusMessage: 'No code provided' })
  }
  const supabase = await supabaseServerClient(event)
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    throw createError({ statusMessage: error.message })
  }

  setAuthNoStoreHeaders(event)
  await sendRedirect(event, redirect_to, 302)
})
