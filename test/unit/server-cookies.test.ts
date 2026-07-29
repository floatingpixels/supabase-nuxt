import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { createEvent, getResponseHeader } from 'h3'
import type { H3Event } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const useRuntimeConfig = vi.fn()
const createServerClient = vi.fn()

vi.mock('#imports', () => ({
  useRuntimeConfig,
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient,
}))

// The cache-prevention headers @supabase/ssr passes to setAll alongside auth
// cookies. Hard-coded rather than imported so that a change in the library
// surfaces here as a failure instead of silently redefining the assertion.
const SSR_HEADERS = {
  'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
  'Expires': '0',
  'Pragma': 'no-cache',
}

// A session too large for one cookie is split by @supabase/ssr into numbered
// chunks, all of which have to reach the response.
const CHUNKED_SESSION = [
  { name: 'sb-api-auth-token.0', value: 'base64-chunk-zero', options: { path: '/', maxAge: 34560000 } },
  { name: 'sb-api-auth-token.1', value: 'chunk-one', options: { path: '/', maxAge: 34560000 } },
]

type ServerCookieMethods = {
  getAll: () => { name: string, value: string }[]
  setAll: (
    cookiesToSet: typeof CHUNKED_SESSION,
    headers?: Record<string, string>,
  ) => void
}

const createTestEvent = () => {
  const req = new IncomingMessage(new Socket())
  req.method = 'GET'
  req.url = '/'
  const res = new ServerResponse(req)
  return { event: createEvent(req, res), req, res }
}

// The adapter is not exported on its own: it is the `cookies` option the
// service hands to createServerClient, captured here from the mocked factory.
const cookieAdapterFor = async (event: H3Event): Promise<ServerCookieMethods> => {
  const { supabaseServerClient } = await import('../../src/runtime/server/services/supabaseServerClient')
  await supabaseServerClient(event)
  const options = createServerClient.mock.calls.at(-1)![2] as { cookies: ServerCookieMethods }
  return options.cookies
}

const setCookieHeader = (event: H3Event) => {
  const header = getResponseHeader(event, 'set-cookie')
  if (header === undefined) return []
  return Array.isArray(header) ? header.map(String) : [String(header)]
}

/**
 * Makes the response reject the write that carries `failOn`, standing in for an
 * arbitrary failure of the underlying response (the realistic one being
 * ERR_HTTP_HEADERS_SENT). cookie-es itself validates nothing, so a write can
 * only fail at the response object. Both methods are patched because h3 writes
 * the first cookie with setHeader and every later one with appendHeader.
 */
const failResponseWriteFor = (res: ServerResponse, failOn: string) => {
  for (const method of ['setHeader', 'appendHeader'] as const) {
    const original = res[method].bind(res)
    vi.spyOn(res, method).mockImplementation((name: string, value: unknown) => {
      if (JSON.stringify(value).includes(failOn)) {
        throw new Error('write failed')
      }
      return original(name, value as never)
    })
  }
}

describe('server cookie adapter', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    useRuntimeConfig.mockReturnValue({
      public: {
        supabase: {
          url: 'https://project.supabase.co',
          publishableKey: 'publishable-key',
          clientOptions: {},
        },
      },
    })
    createServerClient.mockReturnValue({ kind: 'server-client' })
  })

  it('writes every cookie chunk and every cache-prevention header on a writable response', async () => {
    const { event } = createTestEvent()

    const cookies = await cookieAdapterFor(event)
    cookies.setAll(CHUNKED_SESSION, SSR_HEADERS)

    const written = setCookieHeader(event)
    expect(written).toHaveLength(2)
    expect(written[0]).toContain('sb-api-auth-token.0=base64-chunk-zero')
    expect(written[1]).toContain('sb-api-auth-token.1=chunk-one')
    expect(written[0]).toContain('Max-Age=34560000')
    expect(written[0]).toContain('Path=/')

    for (const [name, value] of Object.entries(SSR_HEADERS)) {
      expect(getResponseHeader(event, name)).toBe(value)
    }
  })

  it('reads request cookies through getAll', async () => {
    const { event, req } = createTestEvent()
    req.headers.cookie = 'sb-api-auth-token.0=first; other=second'

    const cookies = await cookieAdapterFor(event)
    expect(cookies.getAll()).toEqual([
      { name: 'sb-api-auth-token.0', value: 'first' },
      { name: 'other', value: 'second' },
    ])
  })

  it('propagates ordinary write failures without leaking cookie values', async () => {
    const { event, res } = createTestEvent()
    failResponseWriteFor(res, 'sb-api-auth-token.0')
    const cookies = await cookieAdapterFor(event)

    let raised: unknown
    try {
      cookies.setAll(CHUNKED_SESSION, SSR_HEADERS)
    } catch (error) {
      raised = error
    }

    expect(raised).toBeInstanceOf(Error)
    const cookieError = raised as Error
    expect(cookieError.message).toContain('could not be written')
    expect(cookieError.message).toContain('sb-api-auth-token.0')
    expect(cookieError.message).not.toContain('base64-chunk-zero')
    expect(cookieError.message).not.toContain('chunk-one')
    expect(cookieError.cause).toBeInstanceOf(Error)
  })

  it('propagates a failure to write the cache-prevention headers', async () => {
    const { event, res } = createTestEvent()
    failResponseWriteFor(res, 'no-store')
    const cookies = await cookieAdapterFor(event)

    expect(() => cookies.setAll(CHUNKED_SESSION, SSR_HEADERS))
      .toThrow('could not be written')
  })

  it('reports a committed response as a failure to persist, never as success', async () => {
    const { event, res } = createTestEvent()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const cookies = await cookieAdapterFor(event)

    res.writeHead(200)
    expect(res.headersSent).toBe(true)

    let raised: unknown
    try {
      cookies.setAll(CHUNKED_SESSION, SSR_HEADERS)
    } catch (caught) {
      raised = caught
    }

    expect(raised).toBeInstanceOf(Error)
    const cookieError = raised as Error
    expect(cookieError.message).toContain('could not be persisted')
    expect(cookieError.message).toContain('sb-api-auth-token.0')
    expect(cookieError.message).toContain('Await every Supabase call')
    // auth-js logs whatever a storage callback throws, so the message must not
    // carry token material.
    expect(cookieError.message).not.toContain('base64-chunk-zero')
    expect(cookieError.message).not.toContain('chunk-one')

    for (const spy of [warn, error]) {
      for (const call of spy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain('base64-chunk-zero')
      }
    }

    warn.mockRestore()
    error.mockRestore()
  })

  // Partial chunk sets are not rolled back here: @supabase/ssr validates that a
  // chunked cookie decodes to JSON and treats a mismatched set as absent, so a
  // half-written session is discarded by the library on the next read rather
  // than being mistaken for a valid one.
  it('does nothing when there is nothing to write', async () => {
    const { event } = createTestEvent()
    const cookies = await cookieAdapterFor(event)
    cookies.setAll([], {})
    expect(setCookieHeader(event)).toEqual([])
  })
})
