// @vitest-environment node
import { expect, describe, it } from 'vitest'
import { serviceRole } from './helpers/supabase'

describe('serviceRole', () => {
  it('can select data overriding RLS', async () => {
    const { data, error } = await serviceRole.from('members').select()

    expect(error).toBeNull()
    expect(data).toBeDefined()
    expect(data).toHaveLength(11)
  })
})
