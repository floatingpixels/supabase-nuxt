<script setup lang="ts">
import type { Database } from '~/types/supabase'
const { data } = await useSupabaseClient<Database>().from('members').select()
</script>
<template>
  <div>
    <div>{{ data?.at(0)?.username }}</div>
    <pre data-testid="member-data">{{ data }}</pre>
  </div>
</template>
