import type { SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import type { H3Event } from 'h3'
import { setCookie, parseCookies, setResponseHeaders } from 'h3'
import { useRuntimeConfig } from '#imports'

type CookieSerializeOptions = Parameters<typeof setCookie>[3]

type ServerCookieOptions = {
  getAll: () => { name: string, value: string }[]
  setAll: (
    cookiesToSet: Array<{ name: string, value: string, options?: CookieSerializeOptions }>,
    headers?: Record<string, string>,
  ) => void
}

type ServerClientFactory<T> = (
  supabaseUrl: string,
  supabaseKey: string,
  options: SupabaseClientOptions<string> & { cookies: ServerCookieOptions },
) => SupabaseClient<T>

export const supabaseServerClient = async <T>(event: H3Event): Promise<SupabaseClient<T>> => {
  const {
    supabase: { url, publishableKey, clientOptions },
  } = useRuntimeConfig(event).public

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
        setAll(
          cookiesToSet: Array<{ name: string, value: string, options?: CookieSerializeOptions }>,
          headers: Record<string, string> = {},
        ) {
          const cookieNames = cookiesToSet.map(({ name }) => name).join(', ')
          if (event.node?.res?.headersSent) {
            console.warn(
              `[supabase-nuxt] Could not set auth cookies (${cookieNames}): the response was already sent. `
              + 'A Supabase call likely triggered a token refresh after the response was committed, '
              + 'e.g. a non-awaited query or a lazy asyncData fetch during SSR.',
            )
            return
          }
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              setCookie(event, name, value, options)
            })
            setResponseHeaders(event, headers)
          } catch (error) {
            console.error(`[supabase-nuxt] Error setting cookies (${cookieNames})`, error)
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
