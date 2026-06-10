import type { SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'

type ClientFactory<T> = (
  supabaseUrl: string,
  supabaseKey: string,
  options: SupabaseClientOptions<string>,
) => SupabaseClient<T>

export const supabaseServiceRole = async <T>(event: H3Event): Promise<SupabaseClient<T>> => {
  const {
    supabase: { serviceRoleKey },
    public: {
      supabase: { url },
    },
  } = useRuntimeConfig(event)

  // Make sure service key is set
  if (!serviceRoleKey) {
    throw new Error('Missing `SUPABASE_SERVICE_ROLE_KEY` in `.env`')
  }

  let supabaseClient = event.context._supabaseServiceRole as SupabaseClient<T>
  const createTypedClient = createClient as unknown as ClientFactory<T>

  if (!supabaseClient) {
    supabaseClient = createTypedClient(
      url,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    )
    event.context._supabaseServiceRole = supabaseClient
  }

  return supabaseClient
}
