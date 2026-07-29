import { useSupabaseUser } from '../composables/useSupabaseUser'
import { defineNuxtPlugin, addRouteMiddleware, defineNuxtRouteMiddleware, useRuntimeConfig, navigateTo } from '#imports'
import type { RouteLocationNormalized } from 'vue-router'

export default defineNuxtPlugin({
  name: 'middleware-auth-redirect',
  setup() {
    addRouteMiddleware(
      '01-global-auth-redirect',
      defineNuxtRouteMiddleware(async (to: RouteLocationNormalized) => {
        const config = useRuntimeConfig().public.supabase
        const { login, exclude } = config.redirectOptions

        // Do not redirect on login route and excluded routes. Only `*` is a
        // wildcard; every other character matches literally.
        const isExcluded = [...(exclude || []), login || '/login'].some(path => {
          const pattern = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*')
          return new RegExp(`^${pattern}$`).test(to.path)
        })
        if (isExcluded) return

        const { data: user, error } = await useSupabaseUser()
        if (error || !user) {
          // Carry the intended destination so the login page can send the
          // user back; validate it there with `getRelativeRedirectPath`.
          return navigateTo(
            { path: login || '/login', query: { redirect_to: to.fullPath } },
            { redirectCode: 302 },
          )
        }
      }),
      { global: true },
    )
  },
})
