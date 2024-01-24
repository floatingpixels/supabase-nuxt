import { defineNuxtModule, addPlugin, addTemplate, createResolver, addServerHandler } from '@nuxt/kit'
import type { ModuleOptions } from './runtime/types'
import { defu } from 'defu'

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

    // inject server route to handle PKCE flow
    addServerHandler({
      route: '/supabase/confirm',
      handler: resolve('./runtime/server/api/confirm.ts'),
    })

    //Add route middleware plugin for redirect
    if (options.redirect) {
      addPlugin(resolve('./runtime/plugins/auth-redirect'))
    }

    // Add supabase to the server context
    nuxt.hook('nitro:config', nitroConfig => {
      nitroConfig.alias = nitroConfig.alias || {}
      nitroConfig.alias['#supabase/server'] = resolve('./runtime/server/services')
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
  },
})
