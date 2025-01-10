import { useSupabaseUser } from '../composables/useSupabaseUser'
import { defineNuxtPlugin, addRouteMiddleware, defineNuxtRouteMiddleware, useRuntimeConfig, navigateTo } from 'nuxt/app'
import type { RouteLocationNormalized } from 'vue-router'

export default defineNuxtPlugin({
  name: 'middleware-auth-redirect',
  setup() {
    addRouteMiddleware(
      '01-global-auth-redirect',
      defineNuxtRouteMiddleware(async (to: RouteLocationNormalized) => {
        const config = useRuntimeConfig().public.supabase
        const { login, exclude } = config.redirectOptions

        // Do not redirect on login route and excluded routes
        const isExcluded = [...(exclude || []), login || '/login'].some(path =>
          new RegExp(`^${path.replace(/\*/g, '.*')}$`).test(to.path),
        )
        if (isExcluded) return

        const user = await useSupabaseUser()
        if (!user) {
          return navigateTo('/login', { redirectCode: 302 })
        }
      }),
      { global: true },
    )
  },
})
