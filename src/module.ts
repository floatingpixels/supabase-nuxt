import {
  extendViteConfig,
  defineNuxtModule,
  addPlugin,
  addTypeTemplate,
  createResolver,
  addServerHandler,
} from '@nuxt/kit'
import { defu } from 'defu'
import type { ModuleOptions } from './types'

export * from './types'

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
    url: process.env.NUXT_PUBLIC_SUPABASE_URL as string,
    anonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY as string,
    serviceRoleKey: process.env.NUXT_SUPABASE_SERVICE_ROLE as string,
    redirect: false,
    redirectOptions: {
      login: '/login',
      exclude: [],
    },
    clientOptions: {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    },
  },

  setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    // Make sure url and key are set
    if (!options.url) {
      console.warn('Missing `SUPABASE_URL` in environment')
    }
    if (!options.anonKey) {
      console.warn('Missing `SUPABASE_ANON_KEY` in environment')
    }

    // Public runtimeConfig
    nuxt.options.runtimeConfig.public.supabase = defu(nuxt.options.runtimeConfig.public.supabase, {
      url: options.url,
      anonKey: options.anonKey,
      redirect: options.redirect,
      redirectOptions: options.redirectOptions,
      clientOptions: options.clientOptions,
    })

    // Private runtimeConfig
    nuxt.options.runtimeConfig.supabase = defu(nuxt.options.runtimeConfig.supabase, {
      serviceRoleKey: options.serviceRoleKey,
    })

    // inject server route to handle email confirmation in PKCE flow
    addServerHandler({
      route: '/supabase/auth/confirm',
      handler: resolve('./runtime/server/auth/confirm'),
      method: 'get',
    })

    // inject server route to handle OAuth callback
    addServerHandler({
      route: '/supabase/auth/callback',
      handler: resolve('./runtime/server/auth/callback'),
      method: 'get',
    })

    // Do not add the extension since the `.ts` will be transpiled
    addPlugin(resolve('./runtime/plugins/supabase.server'))
    addPlugin(resolve('./runtime/plugins/supabase.client'))

    // Add supabase composables
    nuxt.hook('imports:dirs', dirs => {
      dirs.push(resolve('./runtime/composables'))
    })

    // Add route middleware plugin for redirect
    if (options.redirect) {
      addPlugin(resolve('./runtime/plugins/middleware-auth-redirect'))
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
    addTypeTemplate({
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
      config.optimizeDeps = defu(typeof config.optimizeDeps === 'object' ? config.optimizeDeps : {}, {
        include: [
          '@supabase/functions-js',
          '@supabase/auth-js',
          '@supabase/postgrest-js',
          '@supabase/realtime-js',
          '@supabase/storage-js',
          '@supabase/supabase-js',
          '@supabase/ssr',
        ],
      })
    })
  },
})
