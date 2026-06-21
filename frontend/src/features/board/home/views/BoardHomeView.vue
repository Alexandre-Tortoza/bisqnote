<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="min-h-full flex flex-col items-center justify-center p-6">
    <h1 class="font-mono text-xs font-bold uppercase tracking-wider text-nb-text">
      {{ t('boardHome.welcome') }}
    </h1>
  </div>
</template>
