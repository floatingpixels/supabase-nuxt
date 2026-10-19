# Changelog

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
