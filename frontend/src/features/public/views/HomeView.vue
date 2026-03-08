<script setup lang="ts"></script>

<template>
  <div
    class="min-h-[calc(100vh-3.5rem)] bg-nb-bg flex flex-col items-center justify-center px-6 py-16"
  >
    <div class="w-full max-w-3xl">
      <!-- Hero card -->
      <div class="border-2 border-nb-border shadow-[var(--nb-shadow-lg)] bg-nb-surface p-10 mb-6">
        <p class="font-mono text-xs font-bold uppercase tracking-widest text-nb-accent mb-4">
          v0.1 — early access
        </p>

        <h1 class="font-display text-6xl font-black leading-none text-nb-text tracking-tight">
          PRIVATE<br />
          BOARDS FOR<br />
          <span class="text-nb-accent">EVERYONE.</span>
        </h1>

        <p class="font-mono text-sm text-nb-muted mt-6 max-w-md leading-relaxed">
          Ephemeral, encrypted, anonymous.<br />
          No accounts. No tracking. No bullshit.
        </p>
      </div>

      <!-- CTA grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RouterLink
          to="/create"
          class="group flex flex-col gap-2 border-2 border-nb-border bg-nb-surface p-6 shadow-[var(--nb-shadow)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100"
        >
          <span class="font-mono text-xs font-bold uppercase tracking-widest text-nb-accent"
            >01</span
          >
          <span class="font-display text-2xl font-black text-nb-text">CREATE A BOARD</span>
          <span class="font-mono text-xs text-nb-muted">Start a new workspace. Share the link.</span>
          <span
            class="font-mono text-xs font-bold text-nb-text mt-2 group-hover:text-nb-accent transition-colors"
            >→ GO</span
          >
        </RouterLink>

        <RouterLink
          to="/join"
          class="group flex flex-col gap-2 border-2 border-nb-border bg-nb-bg p-6 shadow-[var(--nb-shadow)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all duration-100"
        >
          <span class="font-mono text-xs font-bold uppercase tracking-widest text-nb-muted"
            >02</span
          >
          <span class="font-display text-2xl font-black text-nb-text">JOIN A BOARD</span>
          <span class="font-mono text-xs text-nb-muted">Already have a link or board ID?</span>
          <span
            class="font-mono text-xs font-bold text-nb-text mt-2 group-hover:text-nb-accent transition-colors"
            >→ GO</span
          >
        </RouterLink>
      </div>

      <p class="font-mono text-xs text-nb-muted mt-6 text-center">
        BISQNODE — all content is end-to-end encrypted in your browser
      </p>
    </div>
  </div>
</template>
