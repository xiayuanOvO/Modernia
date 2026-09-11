<script setup lang="ts">
import { NMessageProvider, NDialogProvider } from 'naive-ui'
import UpdateBanner from './components/UpdateBanner.vue'
</script>

<template>
  <NMessageProvider>
    <NDialogProvider>
      <router-view />
      <UpdateBanner />
    </NDialogProvider>
  </NMessageProvider>
</template>
