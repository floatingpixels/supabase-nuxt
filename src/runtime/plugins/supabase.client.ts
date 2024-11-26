import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'
import { createBrowserClient } from '@supabase/ssr'

export default defineNuxtPlugin({
  name: 'supabase',
  enforce: 'pre',
  async setup() {
    const config = useRuntimeConfig().public.supabase
    const { url, key } = config

    const supabaseBrowserClient = createBrowserClient(url, key)

    return {
      provide: {
        supabase: {
          client: supabaseBrowserClient,
        },
      },
    }
  },
})
