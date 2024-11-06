import { createError } from 'h3'
import { supabaseServerClient } from '#supabase/server'

export default defineEventHandler(async event => {
  const supabase = await supabaseServerClient(event)
  if (!supabase) {
    throw createError({ statusMessage: 'Supabase client not found' })
  }

  const { data, error } = await supabase.from('posts').select('title, content, comments ( content, member_id )')

  if (error) {
    throw createError({ statusMessage: error?.message })
  }

  return data
})
