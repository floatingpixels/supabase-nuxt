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
      exclude: ['/service'],
    },
  },
  experimental: {
    appManifest: false,
  },
  ignore: ['.direnv'],
})
