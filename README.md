# Supabase Nuxt

![NPM Version](https://img.shields.io/npm/v/%40floatingpixels%2Fsupabase-nuxt?color=28CF8D)
![NPM Downloads](https://img.shields.io/npm/dt/%40floatingpixels%2Fsupabase-nuxt)

## Features

[@floatingpixels/supabase-nuxt](https://github.com/nuxt-modules/supabase) is a Nuxt module for first class integration with Supabase. It makes it easy to use Supabase authentication, database and realtime features in your Nuxt 3 application. Especially when using server-side rendering SSR, using Supabase can be tricky, this module takes care of the intricacies and lets you simply use the power of Supabase!

Checkout the [Nuxt 3](https://v3.nuxtjs.org) documentation and [Supabase](https://supabase.com) to learn more.

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

Add `SUPABASE_URL` and `SUPABASE_KEY` to the `.env`:

```zsh
SUPABASE_URL="https://example.supabase.co"
SUPABASE_KEY="<your_key>"
```

Alternatively, you can prefix the env variables with `NUXT_PUBLIC_` in order to use runtimeConfig.

## Options

You can configure the supabase module by using the `supabase` key in `nuxt.config`:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  // ...
  supabase: {
    // Options
  }
}
```

### `url`

Default: `process.env.SUPABASE_URL` (ex: `https://example.supabase.co`)

The unique Supabase URL which is supplied when you create a new project in your project dashboard.

### `key`

Default: `process.env.SUPABASE_KEY`

Supabase 'anon key', used to bypass the Supabase API gateway and interact with your Supabase database making use of user JWT to apply RLS Policies.

### `serviceKey`

Default: `process.env.SUPABASE_SERVICE_KEY`

Supabase 'service role key', has super admin rights and can bypass your Row Level Security.

### `redirect`

Default: `false`

Redirect automatically to the configured login page if a non authenticated user is navigating to a page. When set to `true` a global middleware is used to check for a logged-in supabase use on all non-excluded routes.

### `redirectOptions`

Default:

```ts [nuxt.config.ts]
  redirectOptions: {
    login: '/login',
    exclude: [],
  }
```

- `login`: User will be redirected to this route if not authenticated or after logout.
- `exclude`: Routes to exclude from the redirect. `['/foo', '/bar/*']` will exclude the `foo` page and all pages in your `bar` folder.

### cookieOptions

```ts
  cookieOptions: {
    maxAge: 60 * 60 * 8,
    sameSite: 'lax',
    secure: true
  }
```

Options for cookies used for authentication and session management, refer to [cookieOptions](https://nuxt.com/docs/api/composables/use-cookie#options) for available settings. Please note that the lifetime set here does not determine the Supabase session lifetime.

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
      emailRedirectTo: 'http://localhost:3000/confirm',
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

Once the authorization flow is triggered using the `auth` wrapper of the `useSupabaseClient` composable, the session management is handled automatically.

If `redirect` is set to `true` in the module options, users will be automatically routed to this page when they are not authenticated. Each time a user is trying to access a page, they will automatically be redirected to the log-in page. If you want to allow access to "public" pages, you just need to add them in the `exclude` `redirect` option.

## Composables

### useSupabaseClient

This composable can be used to make requests to the Supabase API. It's autoimported and ready to use in your components. It's using [supabase-js](https://github.com/supabase/supabase-js/) under the hood, it gives access to the [Supabase client](https://supabase.com/docs/reference/javascript/initializing) and all of its features.

## Database Request

Please check [Supabase](https://supabase.com/docs/reference/javascript/select) documentation on how to fully use the Supabase client.

Here is an example of fetching from the database using the Supabase client's `select` method with Nuxt 3 [useAsyncData](https://nuxt.com/docs/getting-started/data-fetching#useasyncdata).

```vue
<script setup lang="ts">
const client = useSupabaseClient()

const { data: restaurant } = await useAsyncData('restaurant', async () => {
  const { data } = await client.from('restaurants').select('name, location').eq('name', 'My Restaurant Name').single()

  return data
})
</script>
```

## Realtime

Based on [Supabase Realtime](https://github.com/supabase/realtime), listen to changes in your PostgreSQL Database and broadcasts them over WebSockets.

To enable it, make sure you have turned on the [Realtime API](https://supabase.com/docs/guides/api#realtime-api) for your table.

Then, listen to changes directly in your vue page / component:

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

## Typescript

You can pass Database typings to the client. Check Supabase [documentation](https://supabase.com/docs/reference/javascript/release-notes#typescript-support) for further information.

```vue
<script setup lang="ts">
import type { Database } from '~/types'
const client = useSupabaseClient<Database>()
</script>
```

## Authentication

The useSupabaseClient composable is providing all methods to manage authorization under `useSupabaseClient().auth`. For more details please see the [supabase-js auth documentation](https://supabase.com/docs/reference/javascript/auth-api). Here is an example for signing in and out:

> ⚠️ If you want a full explanation on how to handle the authentication process, please read this [section](#authentication).

```ts
<script setup lang="ts">
const supabase = useSupabaseClient()

const signInWithOAuth = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: 'http://localhost:3000/confirm',
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

### supabaseServiceRole

Make requests with super admin rights to the Supabase API with the `supabaseServiceRole` service. This function is designed to work only in [server routes](https://nuxt.com/docs/guide/directory-structure/server#server-routes), there is no vue composable equivalent.

It provides similar functionality as the `supabaseServerClient` but it provides a client with super admin rights that can bypass your [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security).

The client is initialized with the `SUPABASE_SERVICE_KEY` you must have in your `.env` file. Checkout the doc if you want to know more about [Supabase keys](https://supabase.com/docs/learn/auth-deep-dive/auth-deep-dive-jwts#jwts-in-supabase).

> ⚠️ The service key gives admin access to your database, be careful to not expose it in your client side code or in your git repository.

In your server route use the `supabaseServiceRole` from `#supabase/server`.

```ts [server/api/bypass-rls.ts]
import { supabaseServiceRole } from '#supabase/server'

export default eventHandler(async event => {
  const client = supabaseServiceRole(event)

  const { data } = await client.from('rls-protected-table').select()

  return { sensitiveData: data }
})
```
