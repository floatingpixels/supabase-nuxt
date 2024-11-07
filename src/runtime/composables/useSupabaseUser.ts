import { useSupabaseClient } from './useSupabaseClient'

export const useSupabaseUser = async () => {
  const supabase = useSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
