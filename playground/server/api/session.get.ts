import { createError } from 'h3'
import { supabaseServerClient } from '#supabase/server'
import type { Database } from '../../types/supabase'

export default defineEventHandler(async event => {
  const supabase = await supabaseServerClient<Database>(event)
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    throw createError({ statusMessage: error.message })
  }

  return {
    user: data.user
      ? {
          id: data.user.id,
          email: data.user.email,
        }
      : null,
  }
})
