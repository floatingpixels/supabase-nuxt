<script setup lang="ts">
// Two-step email confirmation (`redirectOptions.confirm`): /auth/confirm sends
// email links here instead of verifying them, and only this button spends the
// one-time token, so mail scanners that open links can't.
const route = useRoute()
const field = (name: string) => (typeof route.query[name] === 'string' ? route.query[name] : '')
</script>

<template>
  <form
    method="post"
    action="/auth/confirm"
    style="display: flex; flex-direction: column; align-items: center; gap: 16px; margin-top: 40px"
  >
    <h1>Confirm your email link</h1>
    <input
      type="hidden"
      name="token_hash"
      :value="field('token_hash')"
    >
    <input
      type="hidden"
      name="type"
      :value="field('type')"
    >
    <input
      type="hidden"
      name="redirect_to"
      :value="field('redirect_to')"
    >
    <button type="submit">Continue</button>
  </form>
</template>
