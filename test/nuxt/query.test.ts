// @vitest-environment nuxt
import { beforeAll, describe, expect, it } from 'vitest'
import { setup } from '@nuxt/test-utils'
import { useSupabaseClient } from '#imports'
import type { Database } from '../../playground/types/supabase'

describe('user queries', () => {
  const supabase = useSupabaseClient<Database>()

  beforeAll(async () => {
    await setup({ server: true })

    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'user1@example.com',
      password: 'password',
    })
    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data?.user).toBeDefined()
    expect(data?.session).toBeDefined()
    expect(data?.user?.email).toBe('user1@example.com')
  })

  it('can select data', async () => {
    const { data, error } = await supabase.from('posts').select()

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data).toHaveLength(10)
  })

  it('properly infers types', async () => {
    const { data, error } = await supabase.from('posts').select('post_id, title, comments(comment_id, content)')

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data).toHaveLength(10)
    if (data) {
      const firstPost = data[0]
      expect(typeof firstPost?.post_id).toBe('string')
      expect(typeof firstPost?.title).toBe('string')
      expect(Array.isArray(firstPost?.comments)).toBe(true)
      if (firstPost?.comments?.length && firstPost.comments.length > 0) {
        expect(typeof firstPost.comments[0]?.comment_id).toBe('string')
        expect(typeof firstPost.comments[0]?.content).toBe('string')
      }
    }
  })

  it('respect rls policies', async () => {
    const { data, error } = await supabase.from('members').select()

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data).toHaveLength(1)
  })
})
