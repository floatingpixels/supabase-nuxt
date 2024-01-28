import { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { getCookie, setCookie, H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { CookieOptions } from 'nuxt/app'

export const supabaseServerClient = async <T>(event: H3Event): Promise<SupabaseClient<T>> => {
  const {
    supabase: { url, key, cookieOptions },
  } = useRuntimeConfig().public

  let supabaseClient = event.context._supabaseClient as SupabaseClient<T>

  if (!supabaseClient) {
    supabaseClient = createServerClient(url, key, {
      cookies: {
        get(name: string) {
          return getCookie(event, name)
        },
        set(name: string, value: string) {
          setCookie(event, name, value, cookieOptions as CookieOptions)
        },
        remove(key, options) {
          setCookie(event, key, '', { ...options, expires: 0 })
        },
      },
      cookieOptions: cookieOptions,
    })
    event.context._supabaseClient = supabaseClient
  }

  return supabaseClient
}
