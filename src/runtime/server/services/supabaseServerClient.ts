import { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { getCookie, setCookie } from 'h3'
import type { H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'

export const supabaseServerClient = async <T>(event: H3Event): Promise<SupabaseClient<T>> => {
  const {
    supabase: { url, key },
  } = useRuntimeConfig(event).public

  let supabaseClient = event.context._supabaseClient as SupabaseClient<T>

  if (!supabaseClient) {
    supabaseClient = createServerClient(url, key, {
      cookies: {
        get(name: string) {
          return getCookie(event, name)
        },
        set(name: string, value: string) {
          setCookie(event, name, value)
        },
        remove(key, options) {
          setCookie(event, key, '', { ...options, expires: 0 })
        },
      },
    })
    event.context._supabaseClient = supabaseClient
  }

  return supabaseClient
}
