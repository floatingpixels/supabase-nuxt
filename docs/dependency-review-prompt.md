# Agent prompt: dependency-aware library review

Copy the prompt below into a capable coding agent (e.g. Claude Code) to run a
thorough review of this module against the *current* state of its dependency
ecosystem. Run it periodically (e.g. before a release, or after bumping
`@supabase/ssr` / `@supabase/supabase-js` / `nuxt`), since most of its value
comes from re-checking assumptions that go stale.

---

## Prompt

Review this Nuxt Supabase module (`@floatingpixels/supabase-nuxt`) thoroughly.
Review the last committed state (`HEAD`); ignore uncommitted work unless told
otherwise. Report findings only — do not change code unless asked afterwards.

### 1. Establish ground truth before reviewing

Do not rely on training data for any dependency behavior. For every claim you
make about a library, verify it against one of these, in order of preference:

1. **The installed sources in `node_modules`** — authoritative for this
   lockfile. Read the actual dist output (e.g.
   `node_modules/@supabase/ssr/dist/module/*.js`) rather than trusting typings
   or docs when behavior matters. Print installed versions of
   `@supabase/ssr`, `@supabase/supabase-js`, `nuxt`, `h3`, `nitropack` first.
2. **Official changelogs and release notes** — fetch
   `https://supabase.com/changelog.md` and scan for `breaking-change` entries;
   GitHub releases/CHANGELOG for `supabase/ssr`, `supabase/supabase-js`,
   `nuxt/nuxt`, `h3js/h3` (or `unjs/h3`), `jshttp/cookie`. Compare the pinned
   versions against npm `latest` dist-tags and report how far behind each pin
   is and which intervening changes matter.
3. **Current official docs** — Supabase docs pages are fetchable as markdown
   by appending `.md` to the URL path. Key pages:
   - `https://supabase.com/docs/guides/auth/server-side/creating-a-client.md`
   - `https://supabase.com/docs/guides/api/api-keys.md`
   - `https://h3.dev/migration` (h3 v1→v2 status and renames)
   - Nuxt release blog posts (`https://nuxt.com/blog/...`)

Delegate this research to a parallel subagent if available, and reconcile any
conflict between a doc claim and the installed source by re-reading the
source — the installed source wins.

### 2. Assumptions to re-verify every time (they have gone stale before)

- **`@supabase/ssr` cookie contract.** Which arguments does the library
  actually pass to `setAll`? (As of 0.12 it passes a second `headers` argument
  with cache-prevention headers on the server flush path — verify the current
  values in `dist/module/cookies.js` and that our adapter still forwards
  them.) Is `getAll`/`setAll` still the supported shape, and is the legacy
  `get`/`set`/`remove` shape removed yet?
- **Auth option overrides.** Does `createServerClient` still force
  `flowType`/`autoRefreshToken`/`detectSessionInUrl`/`persistSession` *after*
  user options? If that ordering ever flips, our pass-through of user
  `clientOptions` becomes dangerous.
- **Server-side auth checks.** Current docs guidance (`getClaims()` preferred;
  never `getSession()` for authorization). Check `useSupabaseUser` and the
  middleware still match, including error semantics of `getClaims()`
  (e.g. `AuthInvalidJwtError` since supabase-js 2.107).
- **API key model.** Publishable (`sb_publishable_...`) / secret
  (`sb_secret_...`) vs legacy anon/service_role JWT keys — deprecation
  timeline, and whether our option names, env vars, and README still match
  the recommended model. The secret key must never be reachable client-side.
- **h3 major version.** Which h3 major does the installed Nuxt/Nitro actually
  ship? The cookie adapter's committed-response guard reads `event.node.res`,
  which does not exist in h3 v2 (`event.res`) — if Nuxt has moved to Nitro
  3/h3 2, that guard silently becomes a no-op and must be migrated. Also
  re-check `setCookie` dedup identity (name+path+domain) against how
  `@supabase/ssr` deletes cookies.
- **Cache headers on auth responses.** Every response that carries session
  cookies (or could) must stay out of shared caches. Compare
  `setAuthNoStoreHeaders` in `src/runtime/server/auth/redirect.ts` with the
  header set `@supabase/ssr` currently emits — they are intentionally
  identical; flag drift in either direction.
- **`cookie` npm package.** It was removed from dependencies (only
  `@supabase/ssr` uses it internally). Flag any reintroduction.

### 3. Review the module code itself

Read everything under `src/` (it is small) plus `test/unit`, and check at
least:

- **Security.** Open-redirect validation in
  `src/runtime/server/auth/redirect.ts` (control characters, encoded `/` and
  `\` prefixes, protocol-relative forms); service-role client isolation from
  user cookies; no cookie *values* or tokens in any log or error message; no
  secret config in `runtimeConfig.public`.
- **Cookie write correctness.** One client per request
  (`event.context._supabaseClient`, and the server plugin delegating to it);
  writes fail loud after the response is committed; ssr-supplied headers
  forwarded.
- **HTTP semantics.** Auth routes return 4xx for client mistakes (missing
  params, expired tokens — pass through `error.status`), never 500; upstream
  error text goes in `message`, not the status line.
- **Middleware.** Exclude/login patterns are regex-escaped (only `*` is a
  wildcard); redirect carries `redirect_to`; `navigateTo` still rejects
  external targets by default (this is what makes the README login example
  safe — re-verify it in the installed Nuxt).
- **Module setup.** Runtime config extension (not replacement), type
  template exports in `src/module.ts` matching `#supabase/server` actual
  exports, Vite `optimizeDeps` entries referencing only packages the runtime
  imports, `compatibility` range sane against current Nuxt majors.
- **Tests.** Do the unit tests still test reality? Watch for tests that mock
  a library contract the library no longer has (e.g. asserting `setAll`
  arguments ssr never passes). Prefer tests that capture the real adapter and
  run against real h3 events, as `test/unit/server-cookies.test.ts` does.

### 4. Report format

Lead with a TL;DR verdict. Then:

1. Dependency currency table: pinned vs latest, with an assessment per row.
2. Findings ordered by severity, each with `file:line`, why it matters, and a
   lean suggested fix. Prefer standards from the included libraries over
   hand-written code; do not propose exhaustive hardening for unlikely cases.
3. A short "what's specifically good" section (so intentional patterns are
   not "fixed" away later).
4. Forward-compatibility notes (things not broken today but on a known
   collision course, with the trigger event named).

Constraints for suggested fixes: keep implementation lean, avoid new public
API surface and helper modules unless genuinely necessary, and avoid
over-hardening at the expense of complicated code.
