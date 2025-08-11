import { useSupabaseClient } from './useSupabaseClient'

export const useSupabaseUser = async () => {
  const supabase = useSupabaseClient()

  const { data, error } = await supabase.auth.getClaims()
  return { data: data?.claims, error: error }
}
