import { defineEventHandler } from 'nuxt/server'
import { supabaseServerClient } from '#supabase/server'
import type { Database } from '../../types/supabase'

// The same as /api/session, written with `nuxt/server` (Nuxt >= 4.6), whose
// handlers receive a RequestEvent instead of h3's H3Event.
export default defineEventHandler(async (event) => {
  const supabase = await supabaseServerClient<Database>(event)
  const { data } = await supabase.auth.getUser()
  return { user: data.user ? { id: data.user.id, email: data.user.email } : null }
})
