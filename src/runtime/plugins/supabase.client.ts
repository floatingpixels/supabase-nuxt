import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'
import type { SupabaseClientOptions } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

export default defineNuxtPlugin({
  name: 'supabase',
  enforce: 'pre',
  async setup() {
    const { url, publishableKey, clientOptions } = useRuntimeConfig().public.supabase

    const supabaseBrowserClient = createBrowserClient(
      url,
      publishableKey,
      clientOptions as SupabaseClientOptions<'public'>,
    )

    return {
      provide: {
        supabase: {
          client: supabaseBrowserClient,
        },
      },
    }
  },
})
