import type { SupabaseClientOptions } from '@supabase/supabase-js'

declare module '@nuxt/schema' {
  interface RuntimeConfig {
    supabase: {
      serviceRoleKey?: string
    }
  }

  interface PublicRuntimeConfig {
    supabase: {
      url: string
      publishableKey: string
      redirect: boolean
      redirectOptions: RedirectOptions
      clientOptions: SupabaseClientOptions<string>
    }
  }
}

export interface RedirectOptions {
  /**
   * Login route
   * @default '/login'
   * @type string
   */
  login?: string
  /**
   * Routes to exclude from redirection
   * @default []
   * @type string[]
   */
  exclude?: string[]
}

export interface ModuleOptions {
  /**
   * Supabase API URL
   * @example 'https://*.supabase.co'
   * @type string
   * @docs https://supabase.com/docs/reference/javascript/initializing#parameters
   */
  url?: string

  /**
   * Supabase Publishable Client API Key
   * @example '123456789'
   * @type string
   * @docs https://supabase.com/docs/reference/javascript/initializing#parameters
   */
  publishableKey?: string

  /**
   * Supabase Secret Service Role key
   * @example '123456789'
   * @type string
   * @docs https://supabase.com/docs/reference/javascript/initializing#parameters
   */
  secretKey?: string

  /**
   * Redirect automatically to login page if user is not authenticated
   * @default `false`
   * @type boolean
   */
  redirect?: boolean

  /**
   * Redirection options, set routes for login and specify pages to exclude from redirection
   * @default
   * {
      login: '/login',
      exclude: [],
    }
   * @type RedirectOptions
   */
  redirectOptions?: RedirectOptions

  /**
   * Supabase Client options
   * @default {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
      },
    }
   * @type object
   *@docs https://supabase.com/docs/reference/javascript/initializing#parameters
   */
  clientOptions?: SupabaseClientOptions<string>
}

export {}
