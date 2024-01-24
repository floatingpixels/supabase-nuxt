import { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { getCookie } from 'h3'
import type { H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'

export const supabaseServiceRole = async <T>(event: H3Event): Promise<SupabaseClient<T>> => {
  const {
    supabase: { serviceKey },
    public: {
      supabase: { url },
    },
  } = useRuntimeConfig(event)

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
      },
    })
    event.context._supabaseServiceRole = supabaseClient
  }

  return supabaseClient
}
