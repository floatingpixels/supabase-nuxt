<script setup lang="ts">
import type { H3Error } from 'h3'
const { error } = defineProps<{
  error: H3Error
}>()

const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <div>
    <h2>{{ error.statusCode }}</h2>
    <p>{{ error.message }}</p>
    <button @click="handleError">Clear errors</button>
  </div>
</template>
