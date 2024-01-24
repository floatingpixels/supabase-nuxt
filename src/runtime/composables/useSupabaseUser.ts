import { useSupabaseClient } from './useSupabaseClient'

export const useSupabaseUser = async () => {
  const supabase = useSupabaseClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user) {
    return null
  }

  return session.user
}
