<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import WindowComponent from '@/components/ui/WindowComponent.vue'

const { t } = useI18n()
</script>

<template>
  <div
    class="min-h-[calc(100vh-3.5rem)] bg-nb-bg flex flex-col items-center justify-center px-6 py-16"
  >
    <div class="w-full max-w-3xl">
      <!-- Hero window -->
      <WindowComponent title="BISQNODE">
        <p class="font-mono text-xs font-bold uppercase tracking-widest text-nb-accent mb-4">
          {{ t('home.badge') }}
        </p>

        <h1 class="font-display text-6xl font-black leading-none text-nb-text tracking-tight">
          {{ t('home.headline1') }}<br />
          {{ t('home.headline2') }}<br />
          <span class="text-nb-accent">{{ t('home.headline3') }}</span>
        </h1>

        <p class="font-mono text-sm text-nb-muted mt-6 max-w-md leading-relaxed">
          {{ t('home.tagline') }}<br />
          {{ t('home.taglineSub') }}
        </p>
      </WindowComponent>

      <!-- CTA grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RouterLink
          to="/create"
          class="group flex flex-col gap-2 border-2 border-nb-border bg-nb-surface p-6 shadow-[var(--nb-shadow)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100"
        >
          <span class="font-mono text-xs font-bold uppercase tracking-widest text-nb-accent">01</span>
          <span class="font-display text-2xl font-black text-nb-text">{{ t('home.createTitle') }}</span>
          <span class="font-mono text-xs text-nb-muted">{{ t('home.createDesc') }}</span>
          <span
            class="font-mono text-xs font-bold text-nb-text mt-2 group-hover:text-nb-accent transition-colors"
          >{{ t('home.go') }}</span>
        </RouterLink>

        <RouterLink
          to="/join"
          class="group flex flex-col gap-2 border-2 border-nb-border bg-nb-bg p-6 shadow-[var(--nb-shadow)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100"
        >
          <span class="font-mono text-xs font-bold uppercase tracking-widest text-nb-muted">02</span>
          <span class="font-display text-2xl font-black text-nb-text">{{ t('home.joinTitle') }}</span>
          <span class="font-mono text-xs text-nb-muted">{{ t('home.joinDesc') }}</span>
          <span
            class="font-mono text-xs font-bold text-nb-text mt-2 group-hover:text-nb-accent transition-colors"
          >{{ t('home.go') }}</span>
        </RouterLink>
      </div>

      <p class="font-mono text-xs text-nb-muted mt-6 text-center">
        {{ t('home.footer') }}
      </p>
    </div>
  </div>
</template>
