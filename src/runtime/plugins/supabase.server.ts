import { defineNuxtPlugin, useRuntimeConfig, useRequestEvent } from 'nuxt/app'
import { createServerClient } from '@supabase/ssr'
import { setCookie, parseCookies } from 'h3'

export default defineNuxtPlugin({
  name: 'supabase',
  enforce: 'pre',
  async setup() {
    const { url, anonKey } = useRuntimeConfig().public.supabase
    const event = useRequestEvent()
    if (!event) {
      throw new Error('No request event found')
    }

    const supabaseServerClient = createServerClient(url, anonKey, {
      cookies: {
        getAll: (): { name: string; value: string }[] => {
          const cookie_records = parseCookies(event)
          return Object.entries(cookie_records).map(([name, value]) => ({
            name,
            value,
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
