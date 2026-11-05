# Changelog

## 0.8.0

### Features

- **Auth error page:** `redirectOptions.authError` sends failed `/auth/confirm` and `/auth/callback` requests (expired or reused links, incomplete links, refused OAuth sign-ins) to a page of your app with `?error=<code>&redirect_to=<page>`, instead of an HTTP error. Off by default.
- **Two-step email confirmation:** `redirectOptions.confirm` protects one-time email links from mail scanners that open them (e.g. Safe Links). `GET /auth/confirm` then forwards the link to your confirm page, and its button posts back to `/auth/confirm` (new `POST` handler; `405` while the option is off, `403` for cross-site posts, judged by `Sec-Fetch-Site` or, in older browsers, `Origin`). Off by default.
- `/auth/confirm` and `/auth/callback` accept `next` as an alias for `redirect_to`, as used in Supabase's email template guides.
- `/auth/callback` passes `sb_flow_id` on to `exchangeCodeForSession` (for `auth.experimental.appendPkceFlowIdToRedirects`).
- `getRelativeRedirectPath(value, { host })` accepts an absolute URL on the given host and returns its path.
- The redirect middleware never redirects the `confirm` and `authError` pages.

### Fixes

- **Email templates with `redirect_to={{ .RedirectTo }}` work.** Supabase fills `{{ .RedirectTo }}` with an absolute URL, which `/auth/confirm` and `/auth/callback` rejected with `400`, including in the README's own template example. An absolute target on the host the link was opened on is now accepted and reduced to its path. Every other absolute or protocol-relative target is still rejected.
- `/auth/confirm` rejects an unknown `type` before calling Supabase.
- The Vite pre-bundling entry for `@supabase/postgrest-js` resolves through `@supabase/supabase-js`. Before, it resolved only through pnpm's hidden hoisting. Apps need no `optimizeDeps` entries of their own; remove any bare `cookie` entry, which Nuxt reports as `NUXT_B7002`.
- Auth route handlers return their redirects, ready for h3 v2.

### Documentation

- README: an email template link for every type, failed links, link prefetching, account management (password reset and change, email change), passkeys (no client opt-in needed any more, dashboard and `config.toml` settings, RP ID warning), and Vite pre-bundling.

### Dependencies

- `@supabase/supabase-js` ^2.119.0. Its `auth.experimental.passkey` flag is deprecated and ignored, because passkeys are on by default.
- Development: Nuxt 4.6.4, pnpm 12, Supabase CLI 3, postgres 4, vitest 5.1.

## 0.7.2

### Fixes

- `h3` is now a declared dependency (`^1.15.11`, the h3 1.x line Nitro 2 / Nuxt 4 runs on). The server runtime imports h3 but only listed it as a devDependency, so in apps using pnpm it resolved whatever h3 was hoisted. With h3 2.x present in the app's dependency tree (Nuxt 4.6's tooling pulls it in), every SSR request that read the session crashed with `TypeError: event.req.headers.get is not a function`, and signed-out redirects from protected pages returned 500 instead of 302. Apps that worked around it with a `packageExtensions` entry pinning h3 for this package can drop it.

### Dependencies

- `@supabase/supabase-js` 2.118.0 and `@supabase/ssr` 0.12.7.

## 0.6.0

### Breaking Changes

- `useSupabaseUser()` now returns a normalized authenticated user object instead of raw JWT claims.
- Signed-out state now returns `null` instead of `undefined`.

### Migration

Previous behavior:

```ts
const { data: user } = await useSupabaseUser()

if (user) {
  console.log(user.email)
  console.log(user.first_name)
}
```

New behavior:

```ts
const { data: user } = await useSupabaseUser()

if (user) {
  console.log(user.email)
  console.log(user.user_metadata?.first_name)
  console.log(user.claims)
}
```

What changed:

- `data` is now `SupabaseAuthUser | null`
- raw JWT claims are available under `user.claims`
- `app_metadata` and `user_metadata` are exposed explicitly
- the composable uses `auth.getClaims()` as the fast path and falls back to `auth.getUser()` only when needed to complete the normalized shape

If you previously relied on raw claims:

- replace direct top-level claim access with `user.claims.<field>`
- replace `undefined` signed-out checks with `null` checks

### Fixes

- redirect middleware now honors `redirectOptions.login` instead of always redirecting to `/login`
- `clientOptions` are now forwarded to Supabase browser and server client creation

### Testing

- added structured unit coverage for module wiring, composables, plugins, middleware, server helpers, and auth handlers
- expanded browser coverage for custom login redirects and session persistence
- added type-level coverage for `#supabase/server`
- `pnpm test` now includes `tsc --noEmit`

### Tooling

- updated Nuxt, Vitest, Supabase, and related test dependencies
- updated Nix development environment files
