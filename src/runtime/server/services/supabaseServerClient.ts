import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient, parseCookieHeader } from '@supabase/ssr'
import type { H3Event } from 'h3'
import { setCookie } from 'h3'
import { useRuntimeConfig } from '#imports'

export const supabaseServerClient = async <T>(event: H3Event): Promise<SupabaseClient<T>> => {
  const {
    supabase: { url, anonKey },
  } = useRuntimeConfig().public

  let supabaseClient = event.context._supabaseClient as SupabaseClient<T>

  if (!supabaseClient) {
    supabaseClient = createServerClient(url, anonKey, {
      cookies: {
        getAll: (): { name: string; value: string }[] => {
          const cookie_header = getHeader(event, 'Cookie')
          if (!cookie_header) {
            return []
          }
          return parseCookieHeader(cookie_header).map(item => ({
            name: item.name,
            value: item.value ?? '',
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
    event.context._supabaseClient = supabaseClient
  }

  return supabaseClient
}
