export default defineNuxtConfig({
  modules: ['../src/module'],
  devtools: { enabled: false },
  compatibilityDate: '2024-11-03',
  typescript: {
    typeCheck: true,
    strict: true,
  },
  supabase: {
    redirect: true,
    redirectOptions: {
      login: '/sign-in',
      // `/public` stands for any page that makes no session call during SSR
      // (see test/playwright/session-refresh.test.ts).
      exclude: ['/service', '/public'],
    },
  },
  experimental: {
    appManifest: false,
  },
  ignore: ['.direnv'],
})
