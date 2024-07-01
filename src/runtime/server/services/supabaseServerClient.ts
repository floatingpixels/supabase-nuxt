import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import type { H3Event } from 'h3'
import { parseCookies, setCookie } from 'h3'
import { useRuntimeConfig } from '#imports'

export const supabaseServerClient = async <T>(event: H3Event): Promise<SupabaseClient<T>> => {
  const {
    supabase: { url, key, cookieOptions },
  } = useRuntimeConfig().public

  let supabaseClient = event.context._supabaseClient as SupabaseClient<T>

  if (!supabaseClient) {
    supabaseClient = createServerClient(url, key, {
      cookies: {
        getAll: async () => {
          const cookies = parseCookies(event!)
          return Object.entries(cookies).map(([name, value]) => ({ name, value }))
        },
        setAll: async cookiesToSet => {
          // set the cookies exactly as they appear in the cookiesToSet array
          cookiesToSet.forEach(({ name, value, options }) => {
            setCookie(event!, name, value, { ...cookieOptions, ...options })
          })
        },
      },
      cookieOptions: cookieOptions,
    })
    event.context._supabaseClient = supabaseClient
  }

  return supabaseClient
}
