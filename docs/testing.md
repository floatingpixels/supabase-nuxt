# Testing

This repository uses three testing layers:

- unit tests in `test/unit`
- Nuxt runtime smoke tests in `test/nuxt`
- browser end-to-end tests in `test/playwright`

The tests run against the module wired into the local `playground/` app.

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

## Commands

### `pnpm test`

Runs:

1. `nuxi prepare playground`
2. `tsc --noEmit`
3. `vitest`

This covers:

- type-level test files in `test/types`
- unit tests in `test/unit`
- Nuxt runtime tests in `test/nuxt`

Notes:

- does not start a Nuxt dev server
- does not start Supabase for you
- expects local Supabase to already be running if the live Nuxt smoke tests are included

### `pnpm test:pw`

Runs Playwright tests in `test/playwright`.

Notes:

- does not require `pnpm run dev`
- does start temporary Nuxt test servers through `@nuxt/test-utils/playwright`
- does not start Supabase for you

### `pnpm test:e2e`

Runs:

1. `db:start`
2. `db:reset`
3. `test:pw`
4. `db:stop`

This is the fully managed browser E2E command.

It starts the local Supabase stack automatically, resets the database, runs Playwright, and shuts Supabase down afterwards.

## Local Development Expectations

### `pnpm run dev`

This is only for manual development of the `playground/` app.

It is not required for:

- `pnpm test`
- `pnpm test:pw`
- `pnpm test:e2e`

### Playground

`playground/` is both:

- the local manual development app
- the app fixture used by Nuxt runtime and Playwright tests

To avoid flaky tests:

- keep `playground/` behavior stable
- avoid ad hoc changes that are not reflected in tests
- make test flows self-contained

## Current Coverage Summary

The suite currently covers:

- module registration and runtime config wiring
- generated `#supabase/server` type exposure
- `useSupabaseUser()` normalization behavior
- browser and server Supabase plugin setup
- auth redirect middleware behavior
- server helper memoization
- callback and confirm handler behavior
- live login, redirect, session persistence, query, service role, and RLS smoke paths
