import { defineNuxtPlugin, useRequestEvent } from 'nuxt/app'
import { supabaseServerClient } from '#supabase/server'

export default defineNuxtPlugin({
  name: 'supabase',
  enforce: 'pre',
  async setup() {
    const event = useRequestEvent()
    if (!event) {
      throw new Error('No request event found')
    }

    // Reuse the request-scoped client rather than building a second one. Two
    // clients over the same request would each hold their own auth storage and
    // could refresh the same refresh token concurrently, so one of the two
    // rotations would be lost and its cookies never reach the browser.
    const supabaseServerClientInstance = await supabaseServerClient(event)

    return {
      provide: {
        supabase: {
          client: supabaseServerClientInstance,
        },
      },
    }
  },
  env: {
    islands: true,
  },
})
