import type { SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { useRuntimeConfig } from '#imports'
import type { ServerEvent } from './supabaseServerClient'

type ClientFactory<T> = (
  supabaseUrl: string,
  supabaseKey: string,
  options: SupabaseClientOptions<string>,
) => SupabaseClient<T>

export const supabaseServiceRole = async <T>(serverEvent: ServerEvent): Promise<SupabaseClient<T>> => {
  // A `nuxt/server` event is a Proxy over the H3Event (see ServerEvent).
  const event = serverEvent as H3Event
  const {
    supabase: { serviceRoleKey },
    public: {
      supabase: { url },
    },
  } = useRuntimeConfig(event)

  // Make sure service key is set
  if (!serviceRoleKey) {
    throw new Error('Missing `NUXT_SUPABASE_SERVICE_ROLE_KEY` in `.env`')
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
