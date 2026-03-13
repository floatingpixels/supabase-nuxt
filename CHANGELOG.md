# Changelog

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
