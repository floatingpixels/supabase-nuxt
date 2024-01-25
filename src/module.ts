import { defineNuxtModule, addPlugin, addTemplate, createResolver, addServerHandler, extendViteConfig } from '@nuxt/kit'
import { defu } from 'defu'
import type { ModuleOptions } from './runtime/types'
import type { SupabaseClientOptions } from '@supabase/supabase-js'
import type { CookieOptions } from 'nuxt/app'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'supabase-nuxt',
    configKey: 'supabase',
    compatibility: {
      nuxt: '>3.0.0',
    },
  },
  // Default configuration options of the Nuxt module
  defaults: {
    url: process.env.SUPABASE_URL as string,
    key: process.env.SUPABASE_KEY as string,
    serviceKey: process.env.SUPABASE_SERVICE_KEY as string,
    redirect: false,
    redirectOptions: {
      login: '/login',
      exclude: [],
    },
    cookieOptions: {
      maxAge: 60 * 60 * 8,
      sameSite: 'lax',
      secure: true,
    } as CookieOptions,
    clientOptions: {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    } as SupabaseClientOptions<string>,
  },

  setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    console.log('Module setup function')
    // Make sure url and key are set
    if (!options.url) {
      console.warn('Missing `SUPABASE_URL` in `.env`')
    }
    if (!options.key) {
      console.warn('Missing `SUPABASE_KEY` in `.env`')
    }

    // Public runtimeConfig
    nuxt.options.runtimeConfig.public.supabase = defu(nuxt.options.runtimeConfig.public.supabase, {
      url: options.url,
      key: options.key,
      redirect: options.redirect,
      redirectOptions: options.redirectOptions,
      cookieOptions: options.cookieOptions,
      clientOptions: options.clientOptions,
    })

    // Private runtimeConfig
    nuxt.options.runtimeConfig.supabase = defu(nuxt.options.runtimeConfig.supabase, {
      serviceKey: options.serviceKey,
    })

    // Do not add the extension since the `.ts` will be transpiled
    addPlugin(resolve('./runtime/plugins/supabase.server'))
    addPlugin(resolve('./runtime/plugins/supabase.client'))

    // Add supabase composables
    nuxt.hook('imports:dirs', dirs => {
      dirs.push(resolve('./runtime/composables'))
    })

    // inject server route to handle email confirmation in PKCE flow
    addServerHandler({
      route: '/supabase/confirm',
      handler: resolve('./runtime/server/auth/confirm'),
    })

    // inject server route to handle OAuth callback
    addServerHandler({
      route: '/supabase/callback',
      handler: resolve('./runtime/server/auth/callback'),
    })

    //Add route middleware plugin for redirect
    if (options.redirect) {
      addPlugin(resolve('./runtime/plugins/auth-redirect'))
    }

    nuxt.hook('nitro:config', nitroConfig => {
      // Add supabase to the server context
      nitroConfig.alias = nitroConfig.alias || {}
      nitroConfig.alias['#supabase/server'] = resolve('./runtime/server/services')
      // Inline module runtime in Nitro bundle
      nitroConfig.externals = defu(typeof nitroConfig.externals === 'object' ? nitroConfig.externals : {}, {
        inline: [resolve('./runtime')],
      })
    })

    // Add types
    addTemplate({
      filename: 'types/supabase.d.ts',
      getContents: () =>
        [
          "declare module '#supabase/server' {",
          `  const supabaseServerClient: typeof import('${resolve('./runtime/server/services')}').supabaseServerClient`,
          `  const supabaseServiceRole: typeof import('${resolve('./runtime/server/services')}').supabaseServiceRole`,
          // `  const serverSupabaseUser: typeof import('${resolve('./runtime/server/services')}').serverSupabaseUser`,
          '}',
        ].join('\n'),
    })

    nuxt.hook('prepare:types', options => {
      options.references.push({ path: resolve(nuxt.options.buildDir, 'types/supabase.d.ts') })
    })

    // Pre-bundle supabase packages to avoid CommonJS import issues with ESM
    // e.g. https://github.com/supabase/auth-helpers/issues/725
    extendViteConfig(config => {
      config.optimizeDeps = config.optimizeDeps || {}
      config.optimizeDeps.include = config.optimizeDeps.include || []
      config.optimizeDeps.exclude = config.optimizeDeps.exclude || []
      config.optimizeDeps.include.push(
        '@supabase/functions-js',
        '@supabase/gotrue-js',
        '@supabase/postgrest-js',
        '@supabase/realtime-js',
        '@supabase/storage-js',
        '@supabase/supabase-js',
        '@supabase/ssr',
      )
    })
  },
})
