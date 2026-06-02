import { defineNuxtPlugin, useRuntimeConfig, useRequestEvent } from 'nuxt/app'
import type { SupabaseClientOptions } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { setCookie, parseCookies, setResponseHeaders } from 'h3'

type CookieSerializeOptions = Parameters<typeof setCookie>[3]

export default defineNuxtPlugin({
  name: 'supabase',
  enforce: 'pre',
  async setup() {
    const { url, publishableKey, clientOptions } = useRuntimeConfig().public.supabase
    const event = useRequestEvent()
    if (!event) {
      throw new Error('No request event found')
    }

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
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              setCookie(event, name, value, options)
            })
            setResponseHeaders(event, headers)
          } catch {
            console.error('Error setting cookies', cookiesToSet)
          }
        },
      },
    }

    const supabaseServerClient = createServerClient(
      url,
      publishableKey,
      serverClientOptions as SupabaseClientOptions<'public'> & {
        cookies: {
          getAll: () => { name: string, value: string }[]
          setAll: (
            cookiesToSet: Array<{ name: string, value: string, options?: CookieSerializeOptions }>,
            headers?: Record<string, string>,
          ) => void
        }
      },
    )

    return {
      provide: {
        supabase: {
          client: supabaseServerClient,
        },
      },
    }
  },
  env: {
    islands: true,
  },
})
