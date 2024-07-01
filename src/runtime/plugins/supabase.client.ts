import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'
import { createBrowserClient } from '@supabase/ssr'

export default defineNuxtPlugin({
  name: 'supabase',
  enforce: 'pre',
  async setup() {
    const config = useRuntimeConfig().public.supabase
    const { url, key, cookieOptions } = config

    const supabaseBrowserClient = createBrowserClient(url, key, {
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
