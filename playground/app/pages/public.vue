<!--
  Never redirected and makes no Supabase call, so nothing on its SSR request
  awaits the session: the server client must still persist a refresh in time.
-->
<template>
  <div>
    <h1>Public page</h1>
    <p>Open to everyone, signed in or not.</p>
  </div>
</template>
