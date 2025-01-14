import type { Database } from '~~/playground/types/supabase'
import { createClient } from '@supabase/supabase-js'

const serviceRole = createClient<Database>(
  process.env.NUXT_PUBLIC_SUPABASE_URL!,
  process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY!,
)
const user = createClient<Database>(process.env.NUXT_PUBLIC_SUPABASE_URL!, process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY!)

const signIn = async (index: number) => {
  const { data, error } = await user.auth.signInWithPassword({
    email: `user${index}@example.com`,
    password: 'password',
  })
  if (error) {
    throw error
  }
  if (data?.user?.id) {
    return data.user.id
  } else {
    throw new Error('User ID is not defined')
  }
}

export { user, serviceRole, signIn }
