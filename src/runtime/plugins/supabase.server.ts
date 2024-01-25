import { defineNuxtPlugin, useRuntimeConfig, useRequestEvent } from '#imports'
import { createServerClient } from '@supabase/ssr'
import { getCookie, setCookie } from 'h3'

export default defineNuxtPlugin({
  name: 'supabase',
  enforce: 'pre',
  async setup() {
    const { url, key, cookieOptions } = useRuntimeConfig().public.supabase
    const event = useRequestEvent()

    const supabaseServerClient = createServerClient(url, key, {
      cookies: {
        get(name: string) {
          return getCookie(event, name)
        },
        set(name: string, value: string) {
          setCookie(event, name, value, cookieOptions)
        },
        remove(key, options) {
          setCookie(event, key, '', { ...options, expires: 0 })
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
