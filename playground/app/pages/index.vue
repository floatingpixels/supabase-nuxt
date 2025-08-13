<script setup lang="ts">
const supabase = useSupabaseClient()
// const {
//   data: { user },
// } = await supabase.auth.getUser()
const { data: user } = await useSupabaseUser()

const { data: clientData } = await supabase.from('posts').select('title, content, comments ( content, member_id )')
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
      <div>User Name: {{ user?.user_metadata.user_name }}</div>
      <div>E-Mail: {{ user?.email }}</div>
      <pre data-testid="user-data">{{ user }}</pre>
      <button @click="signOut">Sign out</button>
    </div>
    <div>
      <h2>Data</h2>
      <div>
        <div>Data from browser query (client side)</div>
        <pre data-testid="client-data">{{ clientData }}</pre>
      </div>
      <div>Data from server API (server side)</div>
      <pre data-testid="server-data">{{ serverData }}</pre>
    </div>
  </div>
</template>
