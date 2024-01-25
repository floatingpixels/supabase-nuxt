import { defineEventHandler } from '#imports'
import { createError, getQuery, sendRedirect } from 'h3'
import { supabaseServerClient } from '#supabase/server'

export default defineEventHandler(async event => {
  const query = getQuery(event)
  const code = query.code as string
  const next = (query.next as string) ?? '/'

  if (!code) {
    throw createError({ statusMessage: 'No code provided' })
  }
  const supabase = await supabaseServerClient(event)
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    // TODO: Consider sending user to meaningful error page, or redirect to login with error message
    throw createError({ statusMessage: error.message })
  }

  await sendRedirect(event, next, 302)
})
