export default defineNuxtConfig({
  modules: ['../src/module'],
  supabase: {
    redirect: true,
  },
  devtools: { enabled: false },
  vue: {
    propsDestructure: true,
  },
})
