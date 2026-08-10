# Testing

This repository uses four testing layers:

- unit tests in `test/unit`
- Nuxt runtime smoke tests in `test/nuxt`
- browser end-to-end tests in `test/playwright`
- a packed consumer browser regression test in `test/consumer`

The first three layers run against the module wired into the local `playground/` app. The packed consumer test uses a fresh temporary app instead.

## Test Layers

### Unit

Location: `test/unit`

Purpose:

- verify module wiring and registration
- verify composable behavior
- verify plugin setup behavior
- verify server helper and auth handler behavior

These tests run in plain Vitest with a `node` environment and use mocks heavily. They do not require a running Nuxt dev server.

### Nuxt Runtime

Location: `test/nuxt`

Purpose:

- verify the module inside a real Nuxt test environment
- smoke test auth and query behavior through the `playground/` app

These tests use `@nuxt/test-utils` with the Nuxt environment configured in [vitest.config.mts](/Users/stefan/Development/supabase/vitest.config.mts).

They do not require `pnpm run dev`.

They do require a reachable local Supabase stack for the live auth/query checks.

### Playwright E2E

Location: `test/playwright`

Purpose:

- verify browser login flows
- verify redirects
- verify session persistence across reloads and server requests
- verify end-to-end data fetching and RLS behavior

These tests use `@nuxt/test-utils/playwright` and run against the `playground/` app. Playwright spins up its own temporary built server for the tests. You do not need `pnpm run dev`.

They do require a reachable local Supabase stack.

### Packed Consumer

Location: `test/consumer`

Purpose:

- pack the module exactly as a registry consumer receives it
- install the tarball in an isolated pnpm Nuxt 4.5.2 app with no direct `cookie` dependency
- verify a cold Vite dev start hydrates and initializes `useSupabaseClient()` without CommonJS/ESM errors

This test uses dummy Supabase configuration and an auth-excluded page, so it does not require a live Supabase stack.

## Commands

### `pnpm test:unit`

Runs:

1. `nuxi prepare playground`
2. `tsc --noEmit` (covers the type-level files in `test/types`)
3. `vitest run --project=unit`

Fully hermetic: no dev server, no Supabase, no network. This is what CI's
validate job runs (with `--coverage` appended).

### `pnpm test:nuxt`

Runs the Nuxt runtime tests (`test/nuxt`) only. Requires a running local
Supabase stack. A setup guard (`test/nuxt/setup.ts`) probes
`/auth/v1/health` first and fails fast with an actionable message when the
stack is down, instead of letting the tests fail with confusing assertion
errors.

### `pnpm test:consumer`

Builds and packs the module, installs the tarball into a temporary pnpm
consumer, starts Nuxt with a cold dependency optimizer, and opens the fixture
page in headless Chromium. The temporary consumer is removed whether the test
passes or fails. This test needs registry access when its dependencies are not
already present in the pnpm store, but it does not need Supabase or Docker.

### `pnpm test`

Runs everything `test:unit` and `test:nuxt` cover, in one vitest invocation.
Expects local Supabase to already be running (same guard as `test:nuxt`).

### `pnpm test:pw`

Runs Playwright tests in `test/playwright`, including the request-level
auth-route checks in `auth-routes.test.ts` (status codes, redirect
suppression, cache headers over real HTTP).

Notes:

- does not require `pnpm run dev`
- does start temporary Nuxt test servers through `@nuxt/test-utils/playwright`
- does not start Supabase for you

### `pnpm test:e2e`

Runs `scripts/e2e.sh`: starts the local Supabase stack, resets the database,
runs Playwright, and always stops the stack again — including when tests fail
or the run is interrupted (shell `trap`). Extra arguments are forwarded to
Playwright, e.g. `pnpm test:e2e --project='Desktop Chrome'`.

## Local Development Expectations

### `pnpm run dev`

This is only for manual development of the `playground/` app.

It is not required for:

- `pnpm test`
- `pnpm test:pw`
- `pnpm test:e2e`
- `pnpm test:consumer`

### Playground

`playground/` is both:

- the local manual development app
- the app fixture used by Nuxt runtime and Playwright tests

To avoid flaky tests:

- keep `playground/` behavior stable
- avoid ad hoc changes that are not reflected in tests
- make test flows self-contained

## Continuous Integration

`.github/workflows/ci.yml` runs two parallel jobs on pushes and pull requests
to `main`:

- **Validate** — lint, typecheck, and the hermetic unit suite with coverage
  (`pnpm test:unit --coverage`). Needs no Docker and finishes in seconds.
- **E2E** — installs Playwright Chromium, runs the packed-consumer regression,
  starts the local Supabase stack, seeds it, and runs `test:nuxt` plus the
  Playwright suite. Chromium only:
  the module's session handling is server-side, and the full three-engine
  matrix stays available locally via `pnpm test:e2e`. The Playwright report
  is uploaded as an artifact with short retention, because traces can contain
  session cookies of local fixture users.

The Supabase stack's Docker images are cached in the GitHub Actions cache
(`.github/actions/supabase-image-cache` / `supabase-image-save`, adapted from
besmyle-portal). Anonymous registry pull limits are shared across the IPs of
GitHub-hosted runners, so uncached pulls fail sporadically; the cache key is
derived from the supabase CLI version and `supabase/config.toml`, so it
invalidates exactly when the image set changes.

## Current Coverage Summary

The suite currently covers:

- module registration and runtime config wiring
- generated `#supabase/server` type exposure
- `useSupabaseUser()` normalization behavior
- browser and server Supabase plugin setup
- auth redirect middleware behavior, pattern escaping, and redirect_to forwarding
- server helper memoization and the cookie write adapter (chunking, committed responses, write failures)
- callback and confirm handler behavior, including HTTP-level status, redirect, and cache-header checks
- live login, redirect, session persistence, query, service role, and RLS smoke paths
- packed pnpm consumer hydration and Vite CommonJS dependency interoperability
