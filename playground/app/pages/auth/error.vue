<script setup lang="ts">
// Target of `redirectOptions.authError`: failed email links and OAuth
// callbacks land here with a short code instead of an HTTP error page.
const route = useRoute()
const messages: Record<string, string> = {
  otp_expired: 'This link has expired or was already used. Request a new one.',
  invalid_request: 'This link is incomplete.',
  invalid_redirect: 'This link points somewhere we cannot send you.',
}
const code = computed(() => (typeof route.query.error === 'string' ? route.query.error : 'auth_error'))
</script>

<template>
  <div style="display: flex; flex-direction: column; align-items: center; gap: 16px; margin-top: 40px">
    <h1>Sign-in link failed</h1>
    <p data-testid="auth-error-code">{{ code }}</p>
    <p>{{ messages[code] ?? 'Something went wrong. Please try again.' }}</p>
    <NuxtLink to="/sign-in">Back to sign in</NuxtLink>
  </div>
</template>
