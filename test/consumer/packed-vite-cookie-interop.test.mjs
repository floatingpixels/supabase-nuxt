import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { access, mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
const interopErrorPattern
  = /does not provide an export named ['"](?:parse|serialize)['"]|cookie.*(?:commonjs|esm)|(?:commonjs|esm).*cookie/i

const findPnpmEntrypoint = async () => {
  for (const directory of (process.env.PATH || '').split(delimiter)) {
    if (!directory) continue

    try {
      return await realpath(join(directory, 'pnpm'))
    } catch {
      // Keep searching PATH.
    }
  }

  throw new Error('Could not find pnpm on PATH')
}

const pnpmEntrypoint = process.platform === 'win32' ? undefined : await findPnpmEntrypoint()
const packageManager = process.platform === 'win32' ? 'pnpm.cmd' : process.execPath
const pnpmArgs = args => pnpmEntrypoint ? [pnpmEntrypoint, ...args] : args

const formatProcessFailure = (command, args, output) => [
  `Command failed: ${command} ${args.join(' ')}`,
  output.trim(),
].filter(Boolean).join('\n\n')

const runCommand = (command, args, cwd) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    cwd,
    env: {
      ...process.env,
      NUXT_TELEMETRY_DISABLED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''

  child.stdout.on('data', chunk => {
    output += chunk
  })
  child.stderr.on('data', chunk => {
    output += chunk
  })
  child.on('error', reject)
  child.on('close', code => {
    if (code === 0) resolve(output)
    else reject(new Error(formatProcessFailure(command, args, output)))
  })
})

const getAvailablePort = () => new Promise((resolve, reject) => {
  const server = createServer()
  server.unref()
  server.on('error', reject)
  server.listen(0, '127.0.0.1', () => {
    const address = server.address()
    server.close(error => {
      if (error) reject(error)
      else if (typeof address === 'object' && address) resolve(address.port)
      else reject(new Error('Could not allocate a port for the packed consumer'))
    })
  })
})

const startNuxt = (consumerRoot, port) => {
  const child = spawn(packageManager, pnpmArgs([
    'exec',
    'nuxt',
    'dev',
    '--force',
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
  ]), {
    cwd: consumerRoot,
    detached: process.platform !== 'win32',
    env: {
      ...process.env,
      NUXT_TELEMETRY_DISABLED: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  const appendOutput = chunk => {
    output = `${output}${chunk}`.slice(-50_000)
  }

  child.stdout.on('data', appendOutput)
  child.stderr.on('data', appendOutput)

  return { child, getOutput: () => output }
}

const waitForNuxt = async (url, child, getOutput) => {
  const deadline = Date.now() + 60_000

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Nuxt exited before it became ready.\n\n${getOutput()}`)
    }

    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // The dev server is still starting.
    }

    await delay(250)
  }

  throw new Error(`Timed out waiting for Nuxt.\n\n${getOutput()}`)
}

const stopNuxt = async (child) => {
  if (!child || child.exitCode !== null) return

  const exited = new Promise(resolve => child.once('exit', resolve))
  const signal = value => {
    if (process.platform === 'win32' || !child.pid) child.kill(value)
    else process.kill(-child.pid, value)
  }

  signal('SIGTERM')
  if (await Promise.race([exited.then(() => true), delay(5_000, false)])) return

  signal('SIGKILL')
  await exited
}

const createConsumer = async (consumerRoot, tarballPath) => {
  await mkdir(join(consumerRoot, 'app', 'pages'), { recursive: true })
  await writeFile(join(consumerRoot, 'package.json'), `${JSON.stringify({
    name: 'supabase-nuxt-packed-consumer',
    private: true,
    type: 'module',
    packageManager: 'pnpm@11.4.0',
    dependencies: {
      '@floatingpixels/supabase-nuxt': `file:${tarballPath}`,
      nuxt: '4.5.2',
      vue: '^3.5.0',
      'vue-router': '^4.0.0',
    },
  }, null, 2)}\n`)
  await writeFile(join(consumerRoot, 'pnpm-workspace.yaml'), 'allowBuilds:\n  esbuild: true\n')
  await writeFile(join(consumerRoot, 'nuxt.config.ts'), `export default defineNuxtConfig({
  modules: ['@floatingpixels/supabase-nuxt'],
  devtools: { enabled: false },
  supabase: {
    url: 'https://example.supabase.co',
    publishableKey: 'test-publishable-key',
    redirect: true,
    redirectOptions: {
      login: '/login',
      exclude: ['/consumer'],
    },
  },
})
`)
  await writeFile(join(consumerRoot, 'app', 'app.vue'), `<template>
  <NuxtPage />
</template>
`)
  await writeFile(join(consumerRoot, 'app', 'pages', 'consumer.vue'), `<script setup lang="ts">
const client = useSupabaseClient()
const hydrated = ref(false)

onMounted(() => {
  hydrated.value = true
})
</script>

<template>
  <main>
    <p id="hydrated">{{ hydrated ? 'hydrated' : 'server-rendered' }}</p>
    <p id="supabase-client">{{ client ? 'initialized' : 'missing' }}</p>
  </main>
</template>
`)
}

const temporaryRoot = await mkdtemp(join(tmpdir(), 'supabase-nuxt-packed-consumer-'))
const consumerRoot = join(temporaryRoot, 'consumer')
let browser
let nuxt

try {
  console.log('Packing @floatingpixels/supabase-nuxt...')
  await runCommand(packageManager, pnpmArgs(['pack', '--pack-destination', temporaryRoot]), repoRoot)
  const tarballName = (await readdir(temporaryRoot)).find(name => name.endsWith('.tgz'))
  assert.ok(tarballName, 'pnpm pack did not produce a tarball')

  await createConsumer(consumerRoot, join(temporaryRoot, tarballName))
  const consumerPackage = JSON.parse(await readFile(join(consumerRoot, 'package.json'), 'utf8'))
  assert.equal(consumerPackage.dependencies.cookie, undefined, 'consumer must not declare cookie directly')

  console.log('Installing the tarball in an isolated pnpm consumer...')
  await runCommand(packageManager, pnpmArgs(['install']), consumerRoot)
  await assert.rejects(
    access(join(consumerRoot, 'node_modules', 'cookie')),
    error => error?.code === 'ENOENT',
    'pnpm consumer must not have a top-level cookie dependency',
  )
  const port = await getAvailablePort()
  const consumerUrl = `http://127.0.0.1:${port}/consumer`
  nuxt = startNuxt(consumerRoot, port)
  await waitForNuxt(consumerUrl, nuxt.child, nuxt.getOutput)

  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const pageErrors = []
  const consoleErrors = []

  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  const response = await page.goto(consumerUrl, { waitUntil: 'networkidle' })
  assert.ok(response?.ok(), `consumer page returned HTTP ${response?.status() ?? 'unknown'}`)

  const browserErrors = [...pageErrors, ...consoleErrors]
  const interopError = browserErrors.find(message => interopErrorPattern.test(message))
  assert.equal(interopError, undefined, `cookie CommonJS/ESM interop error: ${interopError}`)
  assert.deepEqual(pageErrors, [], `unexpected page errors:\n${pageErrors.join('\n')}`)
  assert.deepEqual(consoleErrors, [], `unexpected console errors:\n${consoleErrors.join('\n')}`)
  assert.equal(await page.locator('#hydrated').textContent(), 'hydrated', 'consumer page did not hydrate')
  assert.equal(
    await page.locator('#supabase-client').textContent(),
    'initialized',
    'Supabase browser plugin did not expose its client',
  )

  console.log('Packed consumer hydrated with an initialized Supabase client and no browser errors.')
} catch (error) {
  const failure = error instanceof Error ? error : new Error(String(error))
  if (nuxt?.getOutput()) {
    failure.message = `${failure.message}\n\nNuxt output:\n${nuxt.getOutput()}`
  }
  throw failure
} finally {
  await browser?.close()
  await stopNuxt(nuxt?.child)
  await rm(temporaryRoot, { recursive: true, force: true })
}
