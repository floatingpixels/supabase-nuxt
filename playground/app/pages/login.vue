<script setup lang="ts">
const supabase = useSupabaseClient()
const { data: user } = await useSupabaseUser()

const signInWithOAuth = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: 'http://localhost:3000/supabase/auth/callback',
    },
  })
  if (error) console.log(error)
}

const signIn = async () => {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.value,
    options: {
      emailRedirectTo: 'http://localhost:3000/welcome',
    },
  })
  if (error) console.log(error)
}

const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) console.log(error)
}

const authResponse = ref()

const signInWithPassword = async () => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })
  if (error) throw error
  authResponse.value = data.user
}

const email = ref('')
const password = ref()
</script>

<template>
  <div
    style="
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100vh;
      gap: 20px;
    "
  >
    <h1>Login</h1>
    <button @click="signInWithOAuth">Sign In with OAuth (GitHub)</button>
    <button @click="signIn">Sign In with E-Mail</button>
    <button @click="signInWithPassword">Sign In with E-Mail and Password</button>
    <input
      v-model="email"
      type="email"
      name="email"
    />
    <input
      v-model="password"
      type="password"
      name="password"
    />
    <pre id="authResponse">{{ authResponse }}</pre>
    <template v-if="user">
      <h2>
        Logged in as {{ `${user?.user_metadata?.first_name} ${user?.user_metadata?.last_name}` }} - {{ user.email }}
      </h2>
      <NuxtLink to="/">Go to home page</NuxtLink>
      <button @click="signOut">Sign Out</button>
    </template>
  </div>
</template>
