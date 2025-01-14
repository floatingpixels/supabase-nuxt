<script setup lang="ts">
const { data } = await useFetch('/api/service')
</script>

<template>
  <div>
    <div>
      <h2>Data from API with Service Role</h2>
      <div>Data from server API (server side)</div>
      <pre data-testid="server-data">{{ data }}</pre>
    </div>
  </div>
</template>
