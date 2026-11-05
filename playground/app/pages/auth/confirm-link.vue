<script setup lang="ts">
// Two-step email confirmation (`redirectOptions.confirm`): /auth/confirm parks
// the email link in a cookie and opens this page instead of verifying the
// link, and only this button spends the one-time token, so mail scanners that
// open links can't. The token is not in this page's URL. The form posts to
// the module's route, which lives under app.baseURL like the pages.
const action = `${useRuntimeConfig().app.baseURL}auth/confirm`
</script>

<template>
  <form
    method="post"
    :action="action"
    style="display: flex; flex-direction: column; align-items: center; gap: 16px; margin-top: 40px"
  >
    <h1>Confirm your email link</h1>
    <button type="submit">Continue</button>
  </form>
</template>
