<script setup lang="ts">
const supabase = useSupabaseClient()
// const {
//   data: { user },
// } = await supabase.auth.getUser()
const user = await useSupabaseUser()
</script>
<template>
  <div>
    <div>
      <div>User</div>
      <div>{{ user }}</div>
    </div>
    <div>
      <div>Supabase Client</div>
    </div>
  </div>
</template>
