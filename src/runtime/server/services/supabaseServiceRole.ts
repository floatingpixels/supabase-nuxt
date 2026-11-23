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
    supabase: { secretKey: configuredSecretKey, serviceRoleKey },
    public: {
      supabase: { url },
    },
  } = useRuntimeConfig(event)

  // NUXT_SUPABASE_SECRET_KEY, else NUXT_SUPABASE_SERVICE_ROLE_KEY or the
  // `secretKey` option (see the runtime config set up in module.ts).
  const secretKey = configuredSecretKey || serviceRoleKey
  if (!secretKey) {
    throw new Error('Missing `NUXT_SUPABASE_SECRET_KEY` in the environment (or `secretKey` in the module options)')
  }

  let supabaseClient = event.context._supabaseServiceRole as SupabaseClient<T>
  const createTypedClient = createClient as unknown as ClientFactory<T>

  if (!supabaseClient) {
    supabaseClient = createTypedClient(
      url,
      secretKey,
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
