import { defineNuxtPlugin, useRuntimeConfig, useRequestEvent } from '#imports'
import { createServerClient } from '@supabase/ssr'
import { getCookie } from 'h3'

export default defineNuxtPlugin({
  name: 'supabase',
  enforce: 'pre',
  async setup() {
    const { url, key } = useRuntimeConfig().public.supabase
    const event = useRequestEvent()

    const supabaseServerClient = createServerClient(url, key, {
      cookies: {
        get(name: string) {
          return getCookie(event, name)
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
