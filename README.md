# Supabase Nuxt

<p>
  <a href="https://www.npmjs.com/package/@floatingpixels/supabase-nuxt"><img src="https://img.shields.io/npm/v/%40floatingpixels%2Fsupabase-nuxt.svg?style=flat&colorA=18181B&colorB=28CF8D" alt="Version"></a>
  <a href="https://www.npmjs.com/package/@floatingpixels/supabase-nuxt"><img src="https://img.shields.io/npm/dt/%40floatingpixels%2Fsupabase-nuxt.svg?style=flat&colorA=18181B&colorB=28CF8Dt" alt="Downloads"></a>
</p>

## Features

[@floatingpixels/supabase-nuxt](https://github.com/floatingpixels/supabase-nuxt) is a Nuxt module for first-class integration with Supabase. It makes it easy to use Supabase authentication, database and realtime features in your Nuxt 3 or Nuxt 4 application. Especially when using server-side rendering (SSR), using Supabase can be tricky, this module takes care of the intricacies and lets you simply use the power of Supabase!

Check out the [Nuxt](https://nuxt.com/docs) documentation and [Supabase](https://supabase.com/docs) to learn more.

## Testing

Test setup and command behavior are documented in [docs/testing.md](./docs/testing.md).

## Installation

Add `@floatingpixels/supabase-nuxt` dev dependency to your project:

```bash
pnpm add -D @floatingpixels/supabase-nuxt

yarn add --dev @floatingpixels/supabase-nuxt

npm install @floatingpixels/supabase-nuxt --save-dev

bun add -D @floatingpixels/supabase-nuxt
```

Add `@floatingpixels/supabase-nuxt` to the `modules` section of `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@floatingpixels/supabase-nuxt'],
})
```

Add `NUXT_PUBLIC_SUPABASE_URL` and `NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to `.env`:

```zsh
NUXT_PUBLIC_SUPABASE_URL="https://example.supabase.co"
NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=""
```

When dynamically setting the variables in an environment, make sure to prefix the public environment variables with `NUXT_PUBLIC_` in order to use `runtimeConfig`.

The public keys are required to be set in the environment for the module to work. If the service role is needed, you should also set `NUXT_SUPABASE_SERVICE_ROLE_KEY` in the environment, which will be only available on the server side as a private runtime variable.

## Options

You can configure the Supabase module by using the `supabase` key in `nuxt.config`:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  // ...
  supabase: {
    // Options
  }
}
```

The module extends existing `runtimeConfig.public.supabase` and `runtimeConfig.supabase` values instead of replacing them. This lets explicit runtime config and `NUXT_*` environment overrides take precedence over module defaults.

### `url`

Default: `process.env.NUXT_PUBLIC_SUPABASE_URL` (e.g.: `https://example.supabase.co`)

The unique Supabase URL which is supplied when you create a new project in your project dashboard.

### `publishableKey`

Default: `process.env.NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Supabase 'publishable key', used to access the Supabase API gateway and interact with your Supabase database making use of user JWT to apply RLS Policies.

### `secretKey`

Default: `process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY`

Supabase 'service role key', has super admin rights and can bypass your Row Level Security. This can be any secret key configured in your Supabase project.

### `redirect`

Default: `false`

Re-direct automatically to the configured login page if a non authenticated user is navigating to a page. When set to `true` a global middleware is used to check for a logged-in Supabase user on all non-excluded routes.

### `redirectOptions`

Default:

```ts [nuxt.config.ts]
  redirectOptions: {
    login: '/login',
    exclude: [],
    confirm: '',
    authError: '',
  }
```

- `login`: User will be redirected to this route if not authenticated or after logout.
- `exclude`: Routes to exclude from the re-direct. `['/foo', '/bar/*']` will exclude the `foo` page and all pages in your `bar` folder.
- `confirm`: Page for [two-step email confirmation](#email-link-prefetching-two-step-confirmation). When set, `GET /auth/confirm` no longer verifies email links itself: it keeps the link in a short-lived cookie and opens this page, whose button posts back to confirm it. Empty by default: links are verified on `GET`.
- `authError`: Page that failed `/auth/confirm` and `/auth/callback` requests [redirect to](#failed-links), with a short code in the `error` query parameter. Empty by default: failures answer with an HTTP error.

`confirm` and `authError` work independently of `redirect`. When `redirect` is on, both pages (like the login page) are excluded from it automatically, because they serve signed-out users. Both can also be set at runtime with `NUXT_PUBLIC_SUPABASE_REDIRECT_OPTIONS_CONFIRM` and `NUXT_PUBLIC_SUPABASE_REDIRECT_OPTIONS_AUTH_ERROR`.

### `clientOptions`

Default:

```ts
  clientOptions: {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true
    },
  }
```

A documentation of Supabase client options is [available here](https://supabase.com/docs/reference/javascript/initializing#parameters).

Your `clientOptions` are deep-merged into the defaults: setting `{ realtime: { worker: true } }` or a single `auth` option keeps PKCE and the other defaults. The same options are used for the browser client and the server client (where `@supabase/ssr` forces the server-side auth settings it needs).

Passkeys need no client option: in the `@supabase/supabase-js` versions this module requires (2.119+) they are enabled by default, and the former `auth: { experimental: { passkey: true } }` opt-in is deprecated and ignored. See [Passkeys](#passkeys).

## Authentication

The module makes it easy to use [Supabase Auth](https://supabase.com/docs/guides/auth) in your application. In most use-cases for Supabase you'll want users to be authenticated, so you can leverage row-level security (RLS) in the database. Supabase Auth is designed to work perfectly with [RLS](https://supabase.com/docs/guides/auth/row-level-security).

All you need to do is to create a login page, when using the default module settings that's `login.vue` in the `pages` folder. On the log-in page you initiate log-in method(s) you choose from the [available authorization methods](https://supabase.com/docs/reference/javascript/auth-signinwithpassword) provided by Supabase, below is a simple example for e-mail authentication:

```vue
<script setup lang="ts">
const supabase = useSupabaseClient()
const email = ref('')

const signInWithOtp = async () => {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.value,
    options: {
      emailRedirectTo: 'http://localhost:3000/welcome',
    },
  })
  if (error) console.log(error)
}
</script>
<template>
  <div>
    <button @click="signInWithOtp">Sign In with E-Mail</button>
    <input
      v-model="email"
      type="email"
    />
  </div>
</template>
```

> ⚠️ Ensure to activate and configure the authentication providers you want to use in the Supabase Dashboard under `Authentication -> Providers`.

Once the authorization flow is triggered using the `auth` wrapper of the `useSupabaseClient` composable, the session management is handled automatically. For the authentication flow PKCE is used, which requires an exchange between your server and the Supabase authentication server for some authentication methods.

### E-Mail Authentication

Supabase sends emails for sign-up confirmation, magic links, invites, password recovery and email changes. With the PKCE flow the links must point at your app's confirmation route, which this module provides at `/auth/confirm`: it verifies the link's token on the server, sets the session cookies, and redirects to the page the link names. Adjust the templates under `Authentication -> Email Templates` (or `[auth.email.template.*]` in `supabase/config.toml` for local development) so that every link carries `token_hash` and `type`:

| Template | Link |
| --- | --- |
| Confirm signup | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&redirect_to={{ .RedirectTo }}` |
| Magic link | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&redirect_to={{ .RedirectTo }}` |
| Invite user | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&redirect_to={{ .RedirectTo }}` |
| Reset password | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&redirect_to={{ .RedirectTo }}` |
| Change email address | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&redirect_to={{ .RedirectTo }}` |

For example:

```html
<h2>Reset your password</h2>
<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&redirect_to={{ .RedirectTo }}">Set a new password</a>
</p>
```

`type` is one of `email`, `signup`, `magiclink`, `invite`, `recovery` and `email_change`; anything else is rejected before Supabase is called. The [local templates](./supabase/templates/) of this repository's playground are complete examples, and the Playwright tests in `test/playwright/email-flows.test.ts` run each of them end to end.

**Where the link leads.** `redirect_to` names the page users land on after the link is verified; without it they land on `/`. Supabase's own guides call this parameter `next`, which the module accepts as an alias (`redirect_to` wins when both are present). The target must stay on your site:

- `{{ .RedirectTo }}` is the absolute URL your app passed as `emailRedirectTo` (or `redirectTo`), if it is on the project's redirect allow list, otherwise the Site URL. An absolute URL is accepted only if it points at the host the link was opened on (the `Host` header, or `X-Forwarded-Host` behind a proxy), and the user is then redirected to its path. If your proxy passes neither the public host nor `X-Forwarded-Host`, or the Site URL's host differs from the one users open (`example.com` vs `www.example.com`), use relative paths in the templates instead.
- A relative path such as `next=/account/password` works as well, for templates with a fixed destination.
- Anything else (other hosts, protocol-relative `//host`, backslashes, control characters) answers `400`, or goes to the [error page](#failed-links).

Invite and recovery links leave the user signed in, so the page they land on can call `updateUser({ password })` (see [Account management](#account-management)).

The route is provided by this module, so you don't need to implement it yourself. If you want to customize it, create your own server route, point the templates at it, and use the server helpers to verify and redirect:

> ⚠️ You can use the provided confirm route at `/auth/confirm`, the implementation of a custom route is optional!

```ts [server/routes/auth/verify.get.ts]
import type { EmailOtpType } from '@supabase/supabase-js'
import { supabaseServerClient, getRelativeRedirectPath, setAuthNoStoreHeaders } from '#supabase/server'

export default defineEventHandler(async event => {
  setAuthNoStoreHeaders(event)

  const query = getQuery(event)
  const token_hash = query.token_hash as string
  const type = query.type as EmailOtpType | null
  // `host` lets Supabase's absolute {{ .RedirectTo }} through when it points at this site.
  const redirectTo = getRelativeRedirectPath(query.redirect_to ?? query.next, { host: getRequestHost(event) })

  if (!token_hash || !type) {
    throw createError({ statusCode: 400, message: 'Invalid token' })
  }

  const supabase = await supabaseServerClient(event)
  const { error } = await supabase.auth.verifyOtp({ type, token_hash })

  if (error) {
    throw createError({ statusCode: error.status ?? 400, message: error.message })
  }

  return sendRedirect(event, redirectTo, 302)
})
```

#### Failed links

An expired, reused or incomplete link makes `/auth/confirm` answer with an HTTP error (`400`, or the status Supabase answered with, e.g. `403` for an expired token), which renders your app's [error page](#error-handling). To send users to a page of your own instead, set `redirectOptions.authError`:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  supabase: {
    redirectOptions: {
      authError: '/login',
    },
  },
})
```

Failures then redirect to `/login?error=<code>&redirect_to=<page>`:

- `error` is Supabase's error code when there is one (`otp_expired` for an expired or already used link, also when the two-step confirm button has no link to confirm, `flow_state_not_found`, ...), `invalid_request` for a link without `token_hash` or a valid `type`, `invalid_redirect` for a target outside the site, `auth_error` otherwise. On `/auth/callback` it is the OAuth provider's `error_code`/`error` (e.g. `access_denied`) when the provider refused.
- `redirect_to` is the link's validated destination (`/` when the link named none; left out when the destination itself was invalid), so the page can offer to send a new link and continue there afterwards. Validate it like any other redirect target before you use it.

#### Email link prefetching (two-step confirmation)

Some mail security scanners, such as Microsoft Defender's Safe Links, open every link in an email before the recipient does. Email links are one-time links, so the scanner spends the token and the user then gets "Email link is invalid or has expired" (`otp_expired`). Supabase [recommends](https://supabase.com/docs/guides/auth/auth-email-templates) either sending the 6-digit code (`{{ .Token }}`) to be entered with `verifyOtp({ email, token, type })`, or linking to a page with a button that performs the actual verification.

The module supports the second approach with `redirectOptions.confirm`:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  supabase: {
    redirectOptions: {
      confirm: '/auth/confirm-link',
      authError: '/login', // optional, see above
    },
  },
})
```

Email templates keep pointing at `/auth/confirm`. A `GET` there now validates the link and keeps it, unspent, in a short-lived cookie (10 minutes, `HttpOnly`, `SameSite=Lax`, sent only to `/auth/confirm`). It then redirects to your confirm page. The page shows a button that posts back to `/auth/confirm`, which takes the link from the cookie (clearing it), verifies the token, sets the session cookies and redirects with `303`:

```vue [pages/auth/confirm-link.vue]
<template>
  <form method="post" action="/auth/confirm">
    <button type="submit">Continue</button>
  </form>
</template>
```

- **The token never appears in the confirm page's URL.** So analytics, error trackers and the browser history on that page can't record a working sign-in link. The page receives no query parameters at all.
- **A plain HTML form works without JavaScript.** Don't submit it automatically on load: scanners that run JavaScript would spend the token again.
- **One link at a time.** The confirm step works in the browser that opened the link, within 10 minutes, once. Otherwise the button ends like an expired link (`otp_expired`). If several email links are opened before any is confirmed, the last one opened is confirmed.
- **Protected against other sites.** `POST /auth/confirm` answers `405` while `confirm` is not set, and `403` to cross-site submissions (judged by `Sec-Fetch-Site`, or by `Origin` in browsers that don't send it). Because of `SameSite=Lax`, the browser doesn't send the cookie with a cross-site post anyway.

### OAuth Authentication

When using OAuth authentication, you need to configure the OAuth provider in your Supabase settings under `Authentication -> Providers`. You can then use the `signInWithOAuth` method of the `auth` wrapper of the `useSupabaseClient` composable to initiate the authorization flow. This module provides a default callback under `/auth/callback` that you can provide to the authentication function:

```ts [pages/login.vue]
const signInWithOAuth = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: 'http://<your-site-url>/auth/callback',
    },
  })
  if (error) console.log(error)
}
```

The callback also accepts `next` in place of `redirect_to`, and an absolute target on the site's own host, like [`/auth/confirm`](#e-mail-authentication). With `redirectOptions.authError`, a provider that refuses (e.g. the user cancels) and a failed code exchange [redirect to that page](#failed-links). When the client runs with `auth: { experimental: { appendPkceFlowIdToRedirects: true } }`, the callback passes the `sb_flow_id` parameter on to `exchangeCodeForSession`, so concurrent sign-in flows each use their own PKCE verifier.

You can customize the callback by creating your own server route, and point to it when calling `signInWithOAuth`. The callback route will receive a code, that needs to be exchanged for a session. Here is an example:

> ⚠️ You can use the provided callback route at `/auth/callback`, the implementation of a custom callback is optional!

```ts [server/api/callback.ts]
import { supabaseServerClient, getRelativeRedirectPath, setAuthNoStoreHeaders } from '#supabase/server'

export default defineEventHandler(async event => {
  setAuthNoStoreHeaders(event)

  const query = getQuery(event)
  const code = query.code as string
  const redirectTo = getRelativeRedirectPath(query.redirect_to ?? query.next, { host: getRequestHost(event) })

  if (!code) {
    throw createError({ statusCode: 400, message: 'No code provided' })
  }

  const supabase = await supabaseServerClient(event)
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    throw createError({ statusCode: error.status ?? 400, message: error.message })
  }

  return sendRedirect(event, redirectTo, 302)
})
```

### Account management

Password and email changes need no module code: call `supabase-js` through `useSupabaseClient()`, and let the email links come back through [`/auth/confirm`](#e-mail-authentication). The [playground's account page](./playground/app/pages/account.vue) shows all of these together.

```ts
const supabase = useSupabaseClient()

// "Forgot password": the recovery link signs the user in and lands on the given page,
// where they set a new password with updateUser.
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/account/password`,
})

// New password for the signed-in user. With "require current password" enabled for
// the project, Supabase checks `current_password` first (otherwise it is ignored);
// leave it out after an invite or recovery link.
await supabase.auth.updateUser({ password: newPassword, current_password: currentPassword })

// New email address. With "Secure email change" enabled, both the old and the new
// address receive a link (template "Change email address").
await supabase.auth.updateUser({ email: newEmail }, {
  emailRedirectTo: `${window.location.origin}/account`,
})
```

`redirectTo` and `emailRedirectTo` must be on the project's redirect allow list (`Authentication -> URL Configuration`), otherwise Supabase substitutes the Site URL.

Invites are sent from the server with the service role client: `(await supabaseServiceRole(event)).auth.admin.inviteUserByEmail(email, { redirectTo })`.

> ℹ️ Observed with the local Supabase stack of CLI 3.0.0 (November 2026): with secure email change enabled, the first of the two links that is opened completes the change, and the other link is then reported as used (`otp_expired`). Check this against your Supabase version before telling users they must confirm both addresses.

> ℹ️ Since `@supabase/supabase-js` 2.119, `signOut({ scope: 'global' })` keeps the local session and returns the error when the server-side sign-out fails (a 401, 403 or 404 counts as success). Fall back to `signOut({ scope: 'local' })` if you need the user signed out regardless.

### Passkeys

[Passkey sign-in](https://supabase.com/docs/guides/auth/passkeys) works with the module's clients as they are: with `@supabase/supabase-js` 2.119+ passkeys need no client option. Enable them in the dashboard under `Authentication -> Passkeys`, with:

- **Relying party ID**: your bare domain (`example.com`: no scheme, port or path).
- **Origins**: the exact origins your app is served from (up to 5, HTTPS except on `localhost`), on that domain or its subdomains.
- **Display name**: shown by the browser's passkey prompt.

> ⚠️ Passkeys are bound to the relying party ID. Changing it later makes every passkey your users registered unusable.

For local development, add to `supabase/config.toml`:

```toml
[auth.passkey]
enabled = true

[auth.webauthn]
rp_display_name = "My App"
rp_id = "localhost"
rp_origins = ["http://localhost:3000"]
```

Then use the client:

```ts
const supabase = useSupabaseClient()

// Signed in (confirmed, non-anonymous user): add a passkey to the account.
await supabase.auth.registerPasskey()

// Manage them, e.g. on an account page.
const { data: passkeys } = await supabase.auth.passkey.list()
await supabase.auth.passkey.update({ passkeyId, friendlyName: 'Work laptop' })
await supabase.auth.passkey.delete({ passkeyId })

// Signed out: sign in with a discoverable passkey, no email needed.
const { error } = await supabase.auth.signInWithPasskey()
if (!error) await navigateTo('/account')
```

The session is written to the same cookies as any other sign-in, so server routes and SSR see it immediately. For autofill sign-in, pass `{ options: { mediation: 'conditional' } }` to `signInWithPasskey` and give the email input `autocomplete="username webauthn"`. Passkeys are still in beta in Supabase. `test/playwright/passkeys.test.ts` covers registration, renaming, sign-in and deletion with a virtual authenticator.

### Redirection for non-authorized users

If `redirect` is set to `true` in the module options, users will be automatically routed to the login page when they are not authenticated. If you want to allow access to "public" pages, you just need to add them in the `exclude` `redirect` option, and they will not re-direct unauthenticated users.

The middleware appends the originally requested URL as a `redirect_to` query parameter, so your login page can send users back where they were headed:

```vue [pages/login.vue]
<script setup lang="ts">
const route = useRoute()
const redirectTo = typeof route.query.redirect_to === 'string' ? route.query.redirect_to : '/'

// after a successful sign-in:
// await navigateTo(redirectTo)
</script>
```

No extra validation is needed here: `navigateTo` rejects absolute and protocol-relative URLs unless explicitly told otherwise, and when you instead thread `redirect_to` through the `/auth/confirm` or `/auth/callback` routes, those validate it server-side with `getRelativeRedirectPath` (importable from `#supabase/server` for custom routes).

The auth check itself, `useSupabaseUser`, is a one-shot async function: it verifies the current session's claims when called (on every navigation, in the middleware's case) and does not subscribe to auth state changes. If your UI needs to react to sign-in/sign-out without a navigation, listen to `useSupabaseClient().auth.onAuthStateChange` yourself.

### Error Handling

When an authentication error occurs, an exception is thrown (unless [`redirectOptions.authError`](#failed-links) sends failed email links and OAuth callbacks to a page instead). You can create an error page in the root of your app, to show an appropriate error message, clear the error and send the user to an appropriate route to continue. Here is an example for `error.vue`:

```vue
<script setup lang="ts">
import type { H3Error } from 'h3'
const { error } = defineProps<{
  error: H3Error
}>()

const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <div>
    <h2>{{ error.statusCode }}</h2>
    <p>{{ error.message }}</p>
    <button @click="handleError">Clear errors</button>
  </div>
</template>
```

## Composables

### useSupabaseClient

This composable can be used to make requests to the Supabase API. It's auto-imported and ready to use in your components. It's using [supabase-js](https://github.com/supabase/supabase-js/) under the hood, it gives access to the [Supabase client](https://supabase.com/docs/reference/javascript/initializing) and all of its features.

#### Database Request

Please check [Supabase](https://supabase.com/docs/reference/javascript/select) documentation on how to fully use the Supabase client.

Here is an example of fetching from the database using the Supabase client's `select` method with Nuxt's [useAsyncData](https://nuxt.com/docs/getting-started/data-fetching#useasyncdata).

```vue
<script setup lang="ts">
const client = useSupabaseClient()

const { data: restaurant } = await useAsyncData('restaurant', async () => {
  const { data } = await client.from('restaurants').select('name, location').eq('name', 'My Restaurant Name').single()

  return data
})
</script>
```

#### Realtime

Based on [Supabase Realtime](https://github.com/supabase/realtime), listen to changes in your PostgreSQL Database and broadcasts them over WebSockets.

To enable it, make sure you have turned on the [Realtime API](https://supabase.com/docs/guides/api#realtime-api) for your table.

Then, listen to changes directly in your Vue page / component:

```vue
<script setup lang="ts">
import type { RealtimeChannel } from '@supabase/supabase-js'

const client = useSupabaseClient()

let realtimeChannel: RealtimeChannel

// Fetch collaborators and get the refresh method provided by useAsyncData
const { data: collaborators, refresh: refreshCollaborators } = await useAsyncData('collaborators', async () => {
  const { data } = await client.from('collaborators').select('name')
  return data
})

// Once page is mounted, listen to changes on the `collaborators` table and refresh collaborators when receiving event
onMounted(() => {
  // Real time listener for new workouts
  realtimeChannel = client
    .channel('public:collaborators')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'collaborators' }, () => refreshCollaborators())

  realtimeChannel.subscribe()
})

// Don't forget to unsubscribe when user left the page
onUnmounted(() => {
  client.removeChannel(realtimeChannel)
})
</script>
```

#### Type Support

You can pass Database typings to the client. Check Supabase [documentation](https://supabase.com/docs/reference/javascript/release-notes#typescript-support) for further information.

```vue
<script setup lang="ts">
import type { Database } from '~/types'
const client = useSupabaseClient<Database>()
</script>
```

#### Authentication Client

The `useSupabaseClient` composable is providing all methods to manage authorization under `useSupabaseClient().auth`. For more details please see the [supabase-js auth documentation](https://supabase.com/docs/reference/javascript/auth-api). Here is an example for signing in and out:

> ⚠️ If you want a full explanation on how to handle the authentication process, please read this [section](#authentication).

```ts
<script setup lang="ts">
const supabase = useSupabaseClient()

const signInWithOAuth = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: 'http://localhost:3000/auth/callback',
    },
  })
  if (error) console.log(error)
}

const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) console.log(error)
}
</script>
```

### Vite pre-bundling

The module adds its Supabase dependencies to Vite's `optimizeDeps.include` (as nested entries such as `@floatingpixels/supabase-nuxt > @supabase/ssr > cookie`), so the CommonJS `cookie` package that `@supabase/ssr` uses works in the browser. Your app needs no `optimizeDeps` entry of its own for Supabase or `cookie`. A leftover bare `cookie` entry can't be resolved under pnpm and makes Nuxt warn with `NUXT_B7002`. Remove it.

## Server Side Services

### supabaseServerClient

Make requests to the Supabase API on server side with the supabaseServerClient service. It provides the same functionality as the `useSupabaseClient` composable, but it is designed to be used on [server routes](https://nuxt.com/docs/guide/directory-structure/server#server-routes).

On your server route import the `supabaseServerClient` from `#supabase/server`. Please note that `supabaseServerClient` is returning a promise.

```ts [server/api/libraries.ts]
import { supabaseServerClient } from '#supabase/server'

export default eventHandler(async event => {
  const client = await supabaseServerClient(event)

  const { data } = await client.from('libraries').select('*')

  return { libraries: data }
})
```

### Always await Supabase calls before the response is sent

Supabase rotates the access token in the background, and the rotated session is
written back to the browser as `sb-*-auth-token` cookies on the response of the
request that triggered the refresh. Response headers can only be set while the
response is still open, so **every Supabase call must be awaited before the
handler returns or the page finishes rendering**.

```ts
// ✅ awaited: the refreshed session is written to the response
const { data } = await client.from('libraries').select('*')

// ❌ not awaited: the refresh may land after the response is sent, and the
// rotated session can never reach the browser
client.from('libraries').select('*')
```

The same applies during SSR. `useAsyncData` and `useFetch` are awaited as part
of rendering and are safe; their `useLazyAsyncData` and `useLazyFetch` variants
are not awaited before the response is committed, so a Supabase call inside one
of them can refresh the session too late for its cookies to be saved.

When that happens the module raises an error naming the cookies it could not
persist, rather than letting the request continue as if the session had been
stored. The error never contains cookie values or tokens. If you see it, find
the Supabase call that is not awaited: the browser is still holding the
superseded refresh token, so it will keep re-refreshing and can eventually be
signed out.

### supabaseServiceRole

Make requests with super admin rights to the Supabase API with the `supabaseServiceRole` service. This function is designed to work only in [server routes](https://nuxt.com/docs/guide/directory-structure/server#server-routes), there is no Vue composable equivalent.

It provides similar functionality as the `supabaseServerClient` but it provides a client with super admin rights that can bypass your [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security).

The service-role client is isolated from the incoming user's browser session. It does not read or write Supabase auth cookies, so database requests always use the configured service role key instead of a signed-in user's access token.

The client is initialized with the `NUXT_SUPABASE_SERVICE_ROLE_KEY` you must have in your environment. Check out the doc if you want to know more about [Supabase API keys](https://supabase.com/docs/guides/api/api-keys).

> ⚠️ The service key gives admin access to your database, be careful to not expose it in your client side code or in your git repository.

In your server route use the `supabaseServiceRole` from `#supabase/server`.

```ts [server/api/bypass-rls.ts]
import { supabaseServiceRole } from '#supabase/server'

export default eventHandler(async event => {
  const client = await supabaseServiceRole(event)

  const { data } = await client.from('rls-protected-table').select()

  return { sensitiveData: data }
})
```

 <!-- markdownlint-disable-file MD013 -->
 <!-- markdownlint-disable-file MD033 -->
