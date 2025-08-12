import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'
import { createBrowserClient } from '@supabase/ssr'

export default defineNuxtPlugin({
  name: 'supabase',
  enforce: 'pre',
  async setup() {
    const { url, publishableKey } = useRuntimeConfig().public.supabase

    const supabaseBrowserClient = createBrowserClient(url, publishableKey)

    return {
      provide: {
        supabase: {
          client: supabaseBrowserClient,
        },
      },
    }
  },
})
