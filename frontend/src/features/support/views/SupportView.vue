<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

const { t } = useI18n()

const GITHUB_URL = 'https://github.com/alexmrtr/bisqnote'
const GITHUB_ISSUES_URL = 'https://github.com/alexmrtr/bisqnote/issues'
const CONTACT_EMAIL = 'alexandre.tortoza@proton.me'
</script>

<template>
  <div class="min-h-screen bg-nb-bg text-nb-text font-mono">
    <!-- Page header -->
    <div class="border-b-2 border-nb-border bg-nb-surface px-6 py-4 flex items-center justify-between">
      <RouterLink
        to="/"
        class="font-mono text-sm text-nb-muted hover:text-nb-text transition-colors"
      >
        {{ t('support.backHome') }}
      </RouterLink>
      <h1 class="font-display text-xl font-black tracking-tight">
        {{ t('support.pageTitle') }}
      </h1>
    </div>

    <!-- Bento grid -->
    <div class="max-w-4xl mx-auto px-6 py-8 grid grid-cols-3 gap-4">

      <!-- About — full width, top -->
      <section class="col-span-3 border-2 border-nb-accent bg-nb-accent p-8 flex flex-col gap-3">
        <span class="font-mono text-xs font-bold text-white/60 tracking-widest uppercase">01</span>
        <h2 class="font-display text-2xl font-black tracking-tight text-white">
          {{ t('support.aboutTitle') }}
        </h2>
        <p class="text-sm leading-relaxed text-white/80 max-w-2xl">
          {{ t('support.aboutBody') }}
        </p>
      </section>

      <!-- Privacy — 2 cols -->
      <section class="col-span-2 border-2 border-nb-border bg-nb-surface p-6 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="font-mono text-xs font-bold text-nb-muted tracking-widest">02</span>
          <span class="font-mono text-xs font-bold border-2 border-nb-border px-2 py-0.5 text-nb-muted">
            AES-256-GCM
          </span>
        </div>
        <h2 class="font-display text-base font-black tracking-tight">
          {{ t('support.privacyTitle') }}
        </h2>
        <p class="text-sm leading-relaxed text-nb-muted flex-1">
          {{ t('support.privacyBody') }}
        </p>
      </section>

      <!-- License — 1 col -->
      <section class="col-span-1 border-2 border-nb-border bg-nb-surface p-6 flex flex-col gap-3">
        <span class="font-mono text-xs font-bold text-nb-muted tracking-widest">03</span>
        <div class="flex-1 flex flex-col gap-2">
          <div class="border-2 border-nb-border bg-nb-bg px-3 py-2 text-center">
            <span class="font-display text-2xl font-black tracking-tight leading-none">AGPL</span>
            <span class="block font-mono text-xs text-nb-muted mt-1">v3</span>
          </div>
          <h2 class="font-display text-sm font-black tracking-tight">
            {{ t('support.licenseTitle') }}
          </h2>
          <p class="text-xs leading-relaxed text-nb-muted">
            {{ t('support.licenseBody') }}
          </p>
        </div>
      </section>

      <!-- Contribute — 1 col -->
      <section class="col-span-1 border-2 border-nb-border bg-nb-surface p-6 flex flex-col gap-3">
        <span class="font-mono text-xs font-bold text-nb-muted tracking-widest">04</span>
        <h2 class="font-display text-sm font-black tracking-tight">
          {{ t('support.contributeTitle') }}
        </h2>
        <p class="text-xs leading-relaxed text-nb-muted flex-1">
          {{ t('support.contributeBody') }}
        </p>
        <a
          :href="GITHUB_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="block border-2 border-nb-border bg-nb-bg px-3 py-2 font-mono text-xs font-bold text-center hover:bg-nb-text hover:border-nb-text hover:text-nb-bg transition-colors"
        >
          {{ t('support.contributeGithub') }}
        </a>
      </section>

      <!-- Contact — 1 col -->
      <section class="col-span-1 border-2 border-nb-border bg-nb-surface p-6 flex flex-col gap-3">
        <span class="font-mono text-xs font-bold text-nb-muted tracking-widest">05</span>
        <h2 class="font-display text-sm font-black tracking-tight">
          {{ t('support.contactTitle') }}
        </h2>
        <p class="text-xs leading-relaxed text-nb-muted flex-1">
          {{ t('support.contactBody') }}
        </p>
        <div class="flex flex-col gap-2">
          <a
            :href="`mailto:${CONTACT_EMAIL}`"
            class="block border-2 border-nb-border bg-nb-bg px-3 py-2 font-mono text-xs font-bold text-center hover:bg-nb-text hover:border-nb-text hover:text-nb-bg transition-colors truncate"
          >
            {{ t('support.contactEmailLabel') }}
          </a>
          <a
            :href="GITHUB_ISSUES_URL"
            target="_blank"
            rel="noopener noreferrer"
            class="block border-2 border-nb-border bg-nb-bg px-3 py-2 font-mono text-xs font-bold text-center hover:bg-nb-text hover:border-nb-text hover:text-nb-bg transition-colors"
          >
            {{ t('support.contactIssueLabel') }}
          </a>
        </div>
      </section>

      <!-- Donate — 1 col -->
      <section class="col-span-1 border-2 border-nb-border bg-nb-surface p-6 flex flex-col gap-3">
        <span class="font-mono text-xs font-bold text-nb-muted tracking-widest">06</span>
        <h2 class="font-display text-sm font-black tracking-tight">
          {{ t('support.donateTitle') }}
        </h2>
        <p class="text-xs leading-relaxed text-nb-muted flex-1">
          {{ t('support.donateBody') }}
        </p>
        <p class="font-mono text-xs text-nb-muted border-2 border-dashed border-nb-border px-3 py-2 text-center">
          {{ t('support.donateNote') }}
        </p>
      </section>

    </div>
  </div>
</template>
