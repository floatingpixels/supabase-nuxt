import { defineNuxtPlugin, useRuntimeConfig, useRequestEvent } from 'nuxt/app'
import { createServerClient } from '@supabase/ssr'
import { setCookie, parseCookies } from 'h3'

export default defineNuxtPlugin({
  name: 'supabase',
  enforce: 'pre',
  async setup() {
    const { url, key, cookieOptions } = useRuntimeConfig().public.supabase
    const event = useRequestEvent()

    const supabaseServerClient = createServerClient(url, key, {
      cookies: {
        getAll: async () => {
          const cookies = parseCookies(event!)
          return Object.entries(cookies).map(([name, value]) => ({ name, value }))
        },
        setAll: async cookiesToSet => {
          // set the cookies exactly as they appear in the cookiesToSet array
          cookiesToSet.forEach(({ name, value, options }) => {
            setCookie(event!, name, value, { ...cookieOptions, ...options })
          })
        },
      },
      cookieOptions: cookieOptions,
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
