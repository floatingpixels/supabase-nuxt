import { createError } from 'h3'
import { supabaseServerClient } from '#supabase/server'
import type { Database } from '../../types/supabase'

export default defineEventHandler(async event => {
  const supabase = await supabaseServerClient<Database>(event)
  if (!supabase) {
    throw createError({ statusMessage: 'Supabase client not found' })
  }

  const { data, error } = await supabase.from('posts').select('title, content, comments ( content, member_id )')

  if (error) {
    throw createError({ statusMessage: error?.message })
  }

  return data
})
