import type { H3Event } from 'h3'
import type { RequestEvent } from 'nuxt/schema'
import type { SupabaseClient } from '@supabase/supabase-js'
import { setAuthNoStoreHeaders, supabaseServerClient, supabaseServiceRole } from '#supabase/server'
import type { Database } from '../../playground/types/supabase'

const serverClientFactory: (event: H3Event) => Promise<SupabaseClient<Database>> = supabaseServerClient
const serviceRoleFactory: (event: H3Event) => Promise<SupabaseClient<Database>> = supabaseServiceRole

// Handlers written with `nuxt/server` (Nuxt >= 4.6) receive a RequestEvent.
const portableServerClient: (event: RequestEvent) => Promise<SupabaseClient<Database>> = supabaseServerClient
const portableServiceRole: (event: RequestEvent) => Promise<SupabaseClient<Database>> = supabaseServiceRole
const portableNoStore: (event: RequestEvent) => void = setAuthNoStoreHeaders

void serverClientFactory
void serviceRoleFactory
void portableServerClient
void portableServiceRole
void portableNoStore
