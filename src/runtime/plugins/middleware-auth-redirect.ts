import { useSupabaseUser } from '../composables/useSupabaseUser'
import { defineNuxtPlugin, addRouteMiddleware, defineNuxtRouteMiddleware, useRuntimeConfig, useError, navigateTo } from '#imports'
import type { RouteLocationNormalized } from 'vue-router'

export default defineNuxtPlugin({
  name: 'middleware-auth-redirect',
  setup() {
    addRouteMiddleware(
      '01-global-auth-redirect',
      defineNuxtRouteMiddleware(async (to: RouteLocationNormalized) => {
        // The error page renders through the app, so this middleware runs for
        // it too. Redirecting there would replace every error response with a
        // 302 to the login page — e.g. a 400 from /auth/confirm would bounce
        // to /sign-in instead of showing the error.
        if (useError().value) return

        const config = useRuntimeConfig().public.supabase
        const { login, exclude, confirm, authError } = config.redirectOptions

        // Do not redirect on the login, email confirm and auth error pages,
        // which serve signed-out users, nor on excluded routes. Only `*` is a
        // wildcard; every other character matches literally.
        const authPages = [confirm, authError].filter(Boolean).map(page => page!.split(/[?#]/)[0]!)
        const publicPaths = [...(exclude || []), login || '/login', ...authPages]
        const isExcluded = publicPaths.some(path => {
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
