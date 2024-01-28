import { useSupabaseUser } from '../composables/useSupabaseUser'
import { defineNuxtPlugin, addRouteMiddleware, defineNuxtRouteMiddleware, useRuntimeConfig, navigateTo } from '#imports'

export default defineNuxtPlugin({
  name: 'middleware-auth-redirect',
  setup() {
    addRouteMiddleware(
      '02-global-auth-redirect',
      defineNuxtRouteMiddleware(async to => {
        const config = useRuntimeConfig().public.supabase
        const { login, exclude } = config.redirectOptions

        // Do not redirect on login route and excluded routes
        const isExcluded = [...(exclude || []), login ? login : '/login']?.some(path => {
          const regex = new RegExp(`^${path.replace(/\*/g, '.*')}$`)
          return regex.test(to.path)
        })
        if (isExcluded) return

        const user = await useSupabaseUser()
        if (!user) {
          return navigateTo('/login')
        }
      }),
      { global: true },
    )
  },
})
