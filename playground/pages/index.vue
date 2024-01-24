<script setup lang="ts">
const supabase = useSupabaseClient()
// const {
//   data: { user },
// } = await supabase.auth.getUser()
const user = await useSupabaseUser()

const { data: clientData } = await supabase.from('test').select('*')
const { data: serverData } = await useFetch('/api/test')

const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) console.log(error)
}
</script>
<template>
  <div>
    <div>
      <h2>User</h2>
      <div>User ID:{{ user?.id }}</div>
      <div>E-Mail: {{ user?.email }}</div>
      <button @click="signOut">Sign out</button>
    </div>
    <div>
      <h2>Data</h2>
      <div>
        <div>Data from browser query (client side)</div>
        <pre>{{ clientData }}</pre>
      </div>
      <div>Data from server API (server side)</div>
      <pre>{{ serverData }}</pre>
    </div>
  </div>
</template>
