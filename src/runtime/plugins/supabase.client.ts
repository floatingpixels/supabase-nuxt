import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'
import { createBrowserClient } from '@supabase/ssr'

export default defineNuxtPlugin({
  name: 'supabase',
  enforce: 'pre',
  async setup() {
    const config = useRuntimeConfig().public.supabase
    const { url, anonKey } = config

    const supabaseBrowserClient = createBrowserClient(url, anonKey)

    return {
      provide: {
        supabase: {
          client: supabaseBrowserClient,
        },
      },
    }
  },
})
