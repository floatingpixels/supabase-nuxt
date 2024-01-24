import supabase from '../../../src/module'

export default defineNuxtConfig({
  modules: [supabase],
  supabase: {
    url: process.env.SUPABASE_URL as string,
    key: process.env.SUPABASE_KEY as string,
  },
})
