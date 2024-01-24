export default defineNuxtConfig({
  modules: ['../src/module'],
  supabase: {
    redirect: true,
  },
  devtools: { enabled: true },
})
