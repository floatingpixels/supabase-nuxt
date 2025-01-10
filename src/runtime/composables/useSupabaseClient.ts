import type { SupabaseClient } from '@supabase/supabase-js'
import { useNuxtApp } from 'nuxt/app'

export const useSupabaseClient = <T>() => {
  return useNuxtApp().$supabase?.client as SupabaseClient<T>
}
