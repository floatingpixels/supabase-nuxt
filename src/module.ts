import {
  defineNuxtModule,
  addPlugin,
  addTypeTemplate,
  createResolver,
  addServerHandler,
  extendViteConfig,
} from '@nuxt/kit'
import type { ModuleOptions } from './types'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'supabase-nuxt',
    configKey: 'supabase',
    compatibility: {
      nuxt: '>3.0.0',
    },
  },
  defaults: {
    url: undefined,
    publishableKey: undefined,
    secretKey: undefined,
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

    // Make sure url and key are set either in environment or module options
    if (!process.env.NUXT_PUBLIC_SUPABASE_URL && !options.url) {
      console.warn('Missing `NUXT_PUBLIC_SUPABASE_URL` in environment or `url` in module options')
    }
    if (!process.env.NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !options.publishableKey) {
      console.warn(
        'Missing `NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in environment or `publishableKey` in module options',
      )
    }

    nuxt.options.runtimeConfig.public.supabase = {
      url: options.url!,
      publishableKey: options.publishableKey!,
      redirect: options.redirect!,
      redirectOptions: options.redirectOptions!,
      clientOptions: options.clientOptions!,
    }

    nuxt.options.runtimeConfig.supabase = {
      serviceRoleKey: options.secretKey,
    }

    nuxt.options.alias = {
      ...nuxt.options.alias,
      '#supabase/server': resolve('./runtime/server/services'),
    }

    // inject server route to handle email confirmation in PKCE flow
    addServerHandler({
      route: '/auth/confirm',
      handler: resolve('./runtime/server/auth/confirm'),
      method: 'get',
    })

    // inject server route to handle OAuth callback
    addServerHandler({
      route: '/auth/callback',
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
      nitroConfig.alias = {
        ...nitroConfig.alias,
        '#supabase/server': resolve('./runtime/server/services'),
      }
      // Inline module runtime in Nitro bundle
      nitroConfig.externals = {
        ...nitroConfig.externals,
        inline: [...(nitroConfig.externals?.inline || []), resolve('./runtime')],
      }
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
    extendViteConfig(config => {
      config.optimizeDeps = {
        ...config.optimizeDeps,
        include: [
          ...(config.optimizeDeps?.include || []),
          '@floatingpixels/supabase-nuxt > @supabase/postgrest-js',
          '@floatingpixels/supabase-nuxt > cookie',
        ],
      }
    })
  },
})
