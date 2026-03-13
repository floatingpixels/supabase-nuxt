import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseServerClient, supabaseServiceRole } from '#supabase/server'
import type { Database } from '../../playground/types/supabase'

const serverClientFactory: (event: H3Event) => Promise<SupabaseClient<Database>> = supabaseServerClient
const serviceRoleFactory: (event: H3Event) => Promise<SupabaseClient<Database>> = supabaseServiceRole

void serverClientFactory
void serviceRoleFactory
