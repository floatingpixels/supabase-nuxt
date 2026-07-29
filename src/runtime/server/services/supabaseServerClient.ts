import type { SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import type { H3Event } from 'h3'
import { parseCookies, setCookie, setResponseHeaders } from 'h3'
import { useRuntimeConfig } from '#imports'

type CookieSerializeOptions = Parameters<typeof setCookie>[3]

type CookieToSet = {
  name: string
  value: string
  options?: CookieSerializeOptions
}

type ServerCookieMethods = {
  getAll: () => { name: string, value: string }[]
  setAll: (cookiesToSet: CookieToSet[], headers?: Record<string, string>) => void
}

type ServerClientFactory<T> = (
  supabaseUrl: string,
  supabaseKey: string,
  options: SupabaseClientOptions<string> & { cookies: ServerCookieMethods },
) => SupabaseClient<T>

const isResponseCommitted = (event: H3Event) => {
  // event.node is h3 v1 only; h3 v2 (Nitro 3 / Nuxt 5) replaces it with the
  // web-standard event.res, so this guard must be revisited on that migration.
  const res = event.node?.res
  return Boolean(res?.headersSent || res?.writableEnded)
}

/**
 * The `cookies` option for `createServerClient`, backed by the H3 response of a
 * single request.
 *
 * Failures are never swallowed. `@supabase/ssr` calls `setAll` from an
 * `onAuthStateChange` subscriber and auth-js rethrows subscriber errors to the
 * caller, so a failed write surfaces on the `exchangeCodeForSession`,
 * `verifyOtp` or token-refresh call that triggered it instead of letting the
 * request continue as though the session had been persisted. Error messages
 * carry cookie names only, never values: auth-js logs whatever a storage
 * callback throws.
 */
const serverCookieMethods = (event: H3Event): ServerCookieMethods => ({
  getAll: () => {
    return Object.entries(parseCookies(event)).map(([name, value]) => ({ name, value }))
  },

  setAll: (cookiesToSet: CookieToSet[], headers: Record<string, string> = {}) => {
    const cookieNames = cookiesToSet.map(({ name }) => name).join(', ')

    // The response is already on the wire, so nothing can be added to it. The
    // refreshed session exists only in this process while the browser still
    // holds the superseded cookies: a failure to persist, not a no-op.
    if (isResponseCommitted(event)) {
      throw new Error(
        `[supabase-nuxt] Supabase auth cookies (${cookieNames}) could not be persisted because the response was already sent. `
        + 'Await every Supabase call that can refresh the session before the response is committed — '
        + 'a non-awaited query or a lazy fetch during SSR leaves the refreshed session unsaved.',
      )
    }

    try {
      cookiesToSet.forEach(({ name, value, options }) => {
        setCookie(event, name, value, options)
      })
      // Supabase supplies the no-store headers that keep a response carrying
      // session cookies out of shared caches; they are part of the same write.
      setResponseHeaders(event, headers)
    } catch (error) {
      throw new Error(
        `[supabase-nuxt] Supabase auth cookies (${cookieNames}) could not be written to the response.`,
        { cause: error },
      )
    }
  },
})

export const supabaseServerClient = async <T>(event: H3Event): Promise<SupabaseClient<T>> => {
  const {
    supabase: { url, publishableKey, clientOptions },
  } = useRuntimeConfig(event).public

  let supabaseClient = event.context._supabaseClient as SupabaseClient<T>
  const createTypedServerClient = createServerClient as unknown as ServerClientFactory<T>

  if (!supabaseClient) {
    const serverClientOptions = {
      ...(clientOptions as Record<string, unknown>),
      cookies: serverCookieMethods(event),
    }

    supabaseClient = createTypedServerClient(
      url,
      publishableKey,
      serverClientOptions as SupabaseClientOptions<string> & { cookies: ServerCookieMethods },
    )
    event.context._supabaseClient = supabaseClient
  }

  return supabaseClient
}
