import { defineNuxtPlugin, addRouteMiddleware, defineNuxtRouteMiddleware, navigateTo } from '#imports'

export default defineNuxtPlugin({
  name: 'middleware-auth',
  setup() {
    addRouteMiddleware(
      '01-global-auth',
      defineNuxtRouteMiddleware(async to => {
        if (to.path.startsWith('/supabase/')) navigateTo('/') //return false
      }),
      { global: true },
    )
  },
})
