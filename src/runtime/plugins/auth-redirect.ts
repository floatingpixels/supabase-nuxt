import { useSupabaseUser } from '../composables/useSupabaseUser'
import {
  defineNuxtPlugin,
  addRouteMiddleware,
  defineNuxtRouteMiddleware,
  useRuntimeConfig,
  navigateTo,
  abortNavigation,
} from '#imports'

export default defineNuxtPlugin({
  name: 'auth-redirect',
  setup() {
    addRouteMiddleware(
      'global-auth',
      defineNuxtRouteMiddleware(async to => {
        if (to.path === '/supabase/confirm') abortNavigation()

        const config = useRuntimeConfig().public.supabase
        const { login, exclude } = config.redirectOptions

        // Do not redirect on login route and excluded routes
        const isExcluded = [...exclude, login, '/supabase/confirm']?.some(path => {
          const regex = new RegExp(`^${path.replace(/\*/g, '.*')}$`)
          return regex.test(to.path)
        })
        if (isExcluded) return

        const user = await useSupabaseUser()
        if (!user) {
          if (to.path !== '/login') return navigateTo('/login')
        }
      }),
      { global: true },
    )
  },
})
