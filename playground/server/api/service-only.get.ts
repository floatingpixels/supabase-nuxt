import { createError } from 'h3'
import { supabaseServiceRole } from '#supabase/server'
import type { Database } from '../../types/supabase'

export default defineEventHandler(async event => {
  const serviceRole = await supabaseServiceRole<Database>(event)
  const { data, error } = await serviceRole
    .from('service_only_check')
    .select('id, check_name')
    .order('id')

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  return { data }
})
