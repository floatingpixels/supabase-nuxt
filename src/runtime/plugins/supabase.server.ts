import { defineNuxtPlugin, useRuntimeConfig, useRequestEvent } from 'nuxt/app'
import { createServerClient, parseCookieHeader } from '@supabase/ssr'
import { setCookie, getHeader } from 'h3'

export default defineNuxtPlugin({
  name: 'supabase',
  enforce: 'pre',
  async setup() {
    const { url, key } = useRuntimeConfig().public.supabase
    const event = useRequestEvent()
    if (!event) {
      throw new Error('No request event found')
    }

    const supabaseServerClient = createServerClient(url, key, {
      cookies: {
        getAll: async () => {
          return parseCookieHeader(getHeader(event, 'Cookie') ?? '')
        },
        setAll: async cookiesToSet => {
          cookiesToSet.forEach(({ name, value, options }) => {
            setCookie(event, name, value, options)
          })
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
