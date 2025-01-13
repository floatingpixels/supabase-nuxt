import { supabaseServiceRole } from '#supabase/server'
import type { Database } from '../../types/supabase'
import { createError } from 'h3'

export default defineEventHandler(async event => {
  const serviceRole = await supabaseServiceRole<Database>(event)
  if (!serviceRole) {
    throw createError({ statusMessage: 'Supabase serviceRole not available' })
  }

  const { data, error } = await serviceRole.from('members').select()

  if (error) {
    throw createError({ statusMessage: error?.message })
  }

  return data
})
