import { isAuthError } from '@supabase/supabase-js'
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

type RequestClient<T> = {
  client: SupabaseClient<T>
  /**
   * Settles once the session load that creating the client starts has
   * finished, including the cookie writes of any refresh or sign-out it
   * triggered.
   */
  sessionLoaded: Promise<void>
}

/**
 * The request-scoped client, handed out before its session has loaded.
 * Internal: only for a caller that must start an auth call before awaiting
 * `sessionLoaded` (see the OAuth callback); everyone else goes through
 * `supabaseServerClient`.
 */
export const requestClient = async <T>(event: H3Event): Promise<RequestClient<T>> => {
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

    // Creating the client already starts a session load: every
    // `onAuthStateChange` subscription (supabase-js and @supabase/ssr each
    // register one) runs an un-awaited task that emits INITIAL_SESSION, and
    // loading the session refreshes it when it is near expiry. Left alone, that
    // refresh races the response. On a request where nothing awaits a session
    // call (a page that makes no Supabase call, a server route that only
    // creates the client) it lands after the response is committed, setAll
    // throws, the failure surfaces as an unhandled rejection, and the browser
    // keeps the superseded cookies.
    //
    // Loading the session here joins that in-flight refresh (auth-js runs one
    // refresh at a time and hands every concurrent caller the same result) and
    // settles only once its TOKEN_REFRESHED or SIGNED_OUT subscribers, and with
    // them the cookie writes, have finished. A fresh or absent session costs no
    // network call. While Auth is unreachable, auth-js retries the refresh for
    // up to about 30 seconds, as it does for any Supabase call on such a
    // session. `initialize()` would not do: @supabase/ssr disables
    // `autoRefreshToken`, so initialization never refreshes on the server.
    //
    // Concurrent callers on the same request share this promise so that none of
    // them is handed the client before the cookies are written.
    event.context._supabaseSessionLoaded = loadSession(supabaseClient.auth)
  }

  return {
    client: supabaseClient,
    sessionLoaded: event.context._supabaseSessionLoaded as Promise<void>,
  }
}

export const supabaseServerClient = async <T>(event: H3Event): Promise<SupabaseClient<T>> => {
  const { client, sessionLoaded } = await requestClient<T>(event)
  await sessionLoaded
  return client
}

const loadSession = async (auth: SupabaseClient['auth']) => {
  try {
    // The session is discarded: its `user` is read from the cookie unverified,
    // and only getClaims / getUser may vouch for it.
    await auth.getSession()
  } catch (error) {
    // auth-js returns auth errors rather than throwing them, unless the app
    // enabled `throwOnError`. Either way they are not this load's to report:
    // a rejected refresh token leaves the request signed out (auth-js clears
    // the cookies once the access token has expired, and keeps the session
    // until then), and an unreachable Auth server leaves the cookies as they
    // are. The app's own session call sees the same outcome. Anything else,
    // notably a cookie write that failed, is the caller's to handle.
    if (!isAuthError(error)) {
      throw error
    }
  }
}
