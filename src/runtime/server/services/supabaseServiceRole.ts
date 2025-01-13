import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient, parseCookieHeader } from '@supabase/ssr'
import type { H3Event } from 'h3'
import { setCookie, getHeader } from 'h3'
import { useRuntimeConfig } from '#imports'

export const supabaseServiceRole = async <T>(event: H3Event): Promise<SupabaseClient<T>> => {
  const {
    supabase: { serviceRoleKey },
    public: {
      supabase: { url },
    },
  } = useRuntimeConfig()

  // Make sure service key is set
  if (!serviceRoleKey) {
    throw new Error('Missing `SUPABASE_SERVICE_ROLE_KEY` in `.env`')
  }

  let supabaseClient = event.context._supabaseServiceRole as SupabaseClient<T>

  if (!supabaseClient) {
    supabaseClient = createServerClient(url, serviceRoleKey, {
      cookies: {
        getAll: async () => {
          return parseCookieHeader(getHeader(event, 'Cookie') ?? '')
        },
        setAll: async cookiesToSet => {
          // set the cookies exactly as they appear in the cookiesToSet array
          cookiesToSet.forEach(({ name, value, options }) => {
            setCookie(event, name, value, options)
          })
        },
      },
    })
    event.context._supabaseServiceRole = supabaseClient
  }

  return supabaseClient
}
