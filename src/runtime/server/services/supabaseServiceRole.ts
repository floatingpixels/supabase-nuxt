import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import type { H3Event } from 'h3'
import { setCookie, parseCookies } from 'h3'
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
        getAll: (): { name: string; value: string }[] => {
          const cookie_records = parseCookies(event)
          return Object.entries(cookie_records).map(([name, value]) => ({
            name,
            value,
          }))
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              setCookie(event, name, value, options)
            })
          } catch {
            console.error('Error setting cookies', cookiesToSet)
          }
        },
      },
    })
    event.context._supabaseServiceRole = supabaseClient
  }

  return supabaseClient
}
