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

// Email links come back to this app's origin; /auth/confirm accepts absolute
// redirect targets only on the host the link was opened on.
const signIn = async () => {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.value,
    options: {
      emailRedirectTo: `${window.location.origin}/welcome`,
    },
  })
  status.value = error ? error.message : 'Check your email for the sign-in link'
}

const sendPasswordReset = async () => {
  const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
    redirectTo: `${window.location.origin}/account`,
  })
  status.value = error ? error.message : 'Check your email for the password reset link'
}

const signInWithPasskey = async () => {
  const { error } = await supabase.auth.signInWithPasskey()
  if (error) {
    status.value = error.message
    return
  }
  await navigateTo('/account')
}

const status = ref('')

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
    <button @click="sendPasswordReset">Send password reset link</button>
    <button @click="signInWithPasskey">Sign in with a passkey</button>
    <p data-testid="sign-in-status">{{ status }}</p>
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
