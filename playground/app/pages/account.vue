<script setup lang="ts">
import type { PasskeyListItem } from '@supabase/supabase-js'

// Account management with the browser client: password and email change, and
// passkeys. The email shown is rendered server-side, so it reflects the
// session cookies the server sees.
const supabase = useSupabaseClient()
const { data: user } = await useSupabaseUser()

const status = ref('')
const report = (error: { message: string } | null, success: string) => {
  status.value = error ? error.message : success
}

const newPassword = ref('')
const currentPassword = ref('')
const updatePassword = async () => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword.value,
    // Checked by Supabase before the change; not needed after an invite or
    // recovery link.
    current_password: currentPassword.value || undefined,
  })
  report(error, 'Password updated')
}

const newEmail = ref('')
const updateEmail = async () => {
  // With secure email change, both addresses get a link to /auth/confirm.
  const { error } = await supabase.auth.updateUser(
    { email: newEmail.value },
    { emailRedirectTo: `${window.location.origin}/account` },
  )
  report(error, 'Check both inboxes to confirm the change')
}

const passkeys = ref<PasskeyListItem[]>([])
const passkeyNames = ref<Record<string, string>>({})
const loadPasskeys = async () => {
  const { data, error } = await supabase.auth.passkey.list()
  if (error) return report(error, '')
  passkeys.value = data
  passkeyNames.value = Object.fromEntries(data.map(passkey => [passkey.id, passkey.friendly_name ?? '']))
}
const registerPasskey = async () => {
  const { error } = await supabase.auth.registerPasskey()
  report(error, 'Passkey registered')
  await loadPasskeys()
}
const renamePasskey = async (passkeyId: string) => {
  const { error } = await supabase.auth.passkey.update({ passkeyId, friendlyName: passkeyNames.value[passkeyId] ?? '' })
  report(error, 'Passkey renamed')
  await loadPasskeys()
}
const deletePasskey = async (passkeyId: string) => {
  const { error } = await supabase.auth.passkey.delete({ passkeyId })
  report(error, 'Passkey deleted')
  await loadPasskeys()
}
onMounted(loadPasskeys)

const signOut = async () => {
  await supabase.auth.signOut()
  await navigateTo('/sign-in')
}
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 16px; max-width: 480px; margin: 40px auto">
    <h1>Account</h1>
    <p>Signed in as <span data-testid="account-email">{{ user?.email }}</span></p>
    <p
      data-testid="account-status"
      role="status"
    >
      {{ status }}
    </p>

    <form @submit.prevent="updatePassword">
      <h2>Password</h2>
      <input
        v-model="newPassword"
        type="password"
        name="new-password"
        aria-label="New password"
        autocomplete="new-password"
      >
      <input
        v-model="currentPassword"
        type="password"
        name="current-password"
        aria-label="Current password"
        autocomplete="current-password"
      >
      <button type="submit">Save password</button>
    </form>

    <form @submit.prevent="updateEmail">
      <h2>Email</h2>
      <input
        v-model="newEmail"
        type="email"
        name="new-email"
        aria-label="New email"
      >
      <button type="submit">Change email</button>
    </form>

    <section>
      <h2>Passkeys</h2>
      <button @click="registerPasskey">Register a passkey</button>
      <ul data-testid="passkeys">
        <li
          v-for="passkey in passkeys"
          :key="passkey.id"
          data-testid="passkey"
        >
          <span data-testid="passkey-name">{{ passkey.friendly_name || 'Unnamed passkey' }}</span>
          <input
            v-model="passkeyNames[passkey.id]"
            aria-label="Passkey name"
          >
          <button @click="renamePasskey(passkey.id)">Rename</button>
          <button @click="deletePasskey(passkey.id)">Delete</button>
        </li>
      </ul>
    </section>

    <button @click="signOut">Sign out</button>
  </div>
</template>
