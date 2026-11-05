import type { HookResult, NitroConfig } from '@nuxt/schema'
import type { SupabaseClientOptions } from '@supabase/supabase-js'

declare module '@nuxt/schema' {
  interface NuxtHooks {
    'nitro:config': (nitroConfig: NitroConfig) => HookResult
  }

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
  /**
   * Page for two-step email confirmation. When set, `GET /auth/confirm` does
   * not verify the link; it redirects to this page with `token_hash`, `type`
   * and `redirect_to` in the query, and the page's form POSTs them back to
   * `/auth/confirm`. Protects one-time links from mail scanners that open
   * them. The page is excluded from the auth redirect.
   * @default '' (GET verifies directly)
   * @type string
   */
  confirm?: string
  /**
   * Page that failed `/auth/confirm` and `/auth/callback` requests redirect
   * to, with a short code in the `error` query parameter (e.g. `otp_expired`)
   * and `redirect_to` when the link carried a valid one. The page is excluded
   * from the auth redirect.
   * @default '' (failures answer with an HTTP error)
   * @type string
   */
  authError?: string
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
