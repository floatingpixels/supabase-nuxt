import { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { getCookie, setCookie, H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'

export const supabaseServiceRole = async <T>(event: H3Event): Promise<SupabaseClient<T>> => {
  const {
    supabase: { serviceKey },
    public: {
      supabase: { url, cookieOptions },
    },
  } = useRuntimeConfig()

  // Make sure service key is set
  if (!serviceKey) {
    throw new Error('Missing `SUPABASE_SERVICE_KEY` in `.env`')
  }

  let supabaseClient = event.context._supabaseServiceRole as SupabaseClient<T>

  if (!supabaseClient) {
    supabaseClient = createServerClient(url, serviceKey, {
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
      cookieOptions: cookieOptions,
    })
    event.context._supabaseServiceRole = supabaseClient
  }

  return supabaseClient
}
