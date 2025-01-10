import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient, parseCookieHeader } from '@supabase/ssr'
import type { H3Event } from 'h3'
import { setCookie, getHeader } from 'h3'
import { useRuntimeConfig } from 'nuxt/app'

export const supabaseServerClient = async <T>(event: H3Event): Promise<SupabaseClient<T>> => {
  const {
    supabase: { url, anonKey },
  } = useRuntimeConfig().public

  let supabaseClient = event.context._supabaseClient as SupabaseClient<T>

  if (!supabaseClient) {
    supabaseClient = createServerClient(url, anonKey, {
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
    event.context._supabaseClient = supabaseClient
  }

  return supabaseClient
}
