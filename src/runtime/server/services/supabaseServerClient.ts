import type { SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js'
import type { CookieSerializeOptions } from 'cookie-es'
import { createServerClient } from '@supabase/ssr'
import type { H3Event } from 'h3'
import { setCookie, parseCookies } from 'h3'
import { useRuntimeConfig } from '#imports'

type ServerCookieOptions = {
  getAll: () => { name: string, value: string }[]
  setAll: (cookiesToSet: Array<{ name: string, value: string, options?: CookieSerializeOptions }>) => void
}

type ServerClientFactory<T> = (
  supabaseUrl: string,
  supabaseKey: string,
  options: SupabaseClientOptions<string> & { cookies: ServerCookieOptions },
) => SupabaseClient<T>

export const supabaseServerClient = async <T>(event: H3Event): Promise<SupabaseClient<T>> => {
  const {
    supabase: { url, publishableKey, clientOptions },
  } = useRuntimeConfig().public

  let supabaseClient = event.context._supabaseClient as SupabaseClient<T>
  const createTypedServerClient = createServerClient as unknown as ServerClientFactory<T>

  if (!supabaseClient) {
    const serverClientOptions = {
      ...(clientOptions as Record<string, unknown>),
      cookies: {
        getAll: (): { name: string; value: string }[] => {
          const cookie_records = parseCookies(event)
          return Object.entries(cookie_records).map(([name, value]) => ({
            name,
            value,
          }))
        },
        setAll(cookiesToSet: Array<{ name: string, value: string, options?: CookieSerializeOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              setCookie(event, name, value, options)
            })
          } catch {
            console.error('Error setting cookies', cookiesToSet)
          }
        },
      },
    }

    supabaseClient = createTypedServerClient(
      url,
      publishableKey,
      serverClientOptions as SupabaseClientOptions<string> & { cookies: ServerCookieOptions },
    )
    event.context._supabaseClient = supabaseClient
  }

  return supabaseClient
}
