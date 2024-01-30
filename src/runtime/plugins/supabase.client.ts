import { defineNuxtPlugin, useRuntimeConfig, useCookie } from 'nuxt/app'
import { createBrowserClient } from '@supabase/ssr'

export default defineNuxtPlugin({
  name: 'supabase',
  enforce: 'pre',
  async setup() {
    const config = useRuntimeConfig().public.supabase
    const { url, key, cookieOptions } = config

    const supabaseBrowserClient = createBrowserClient(url, key, {
      cookies: {
        get(name: string) {
          return useCookie(name).value
        },
        set(name: string, value: string) {
          useCookie(name, { ...cookieOptions, readonly: false }).value = value
        },
        remove(key, options) {
          useCookie(key, { ...options, expires: 0 }).value = ''
        },
      },
      cookieOptions: cookieOptions,
      isSingleton: true,
    })

    return {
      provide: {
        supabase: {
          client: supabaseBrowserClient,
        },
      },
    }
  },
})
