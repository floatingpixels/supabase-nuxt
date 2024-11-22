import type { SupabaseClientOptions } from '@supabase/supabase-js'
import type { RedirectOptions } from './module'
import type { CookieOptions } from 'nuxt/app'

declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    supabase: {
      url: string
      key: string
      redirect: boolean
      redirectOptions: RedirectOptions
      cookieName: string
      cookieOptions: CookieOptions
      types: string | false
      clientOptions: SupabaseClientOptions<string>
    }
  }
}
