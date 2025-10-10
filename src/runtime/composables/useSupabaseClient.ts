import type { SupabaseClient } from '@supabase/supabase-js'
import { useNuxtApp } from '#imports'

export const useSupabaseClient = <T>() => {
  return (useNuxtApp().$supabase as { client: SupabaseClient<T> })?.client
}
