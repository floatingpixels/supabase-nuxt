import { beforeAll } from 'vitest'

// The tests in this project sign in and query against a live local Supabase
// stack. Without this guard, a stopped stack surfaces as confusing assertion
// failures deep inside the tests instead of one actionable error.
beforeAll(async () => {
  const url = process.env.NUXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'

  try {
    const response = await fetch(`${url}/auth/v1/health`)
    if (!response.ok) {
      throw new Error(`health endpoint answered ${response.status}`)
    }
  } catch (cause) {
    throw new Error(
      `Local Supabase is not reachable at ${url}. `
      + 'Start it with `pnpm db:start` (plus `pnpm db:reset` for a clean seed), '
      + 'or run `pnpm test:unit` for the hermetic suite.',
      { cause },
    )
  }
})
