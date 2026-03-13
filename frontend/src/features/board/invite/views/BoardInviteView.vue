<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/ui/AppButton.vue'

const { t } = useI18n()
const route = useRoute()

const boardId = route.params['id'] as string
const copied = ref(false)

const inviteLink = computed(() => {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/board/${boardId}/enter`
})

async function copyLink() {
  try {
    await navigator.clipboard.writeText(inviteLink.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // Fallback: select the input text
    const input = document.querySelector<HTMLInputElement>('#invite-link-input')
    input?.select()
  }
}
</script>

<template>
  <div class="p-6 flex flex-col items-start gap-6 max-w-lg">
    <!-- Header -->
    <div class="flex flex-col gap-1">
      <h1 class="font-mono text-xs font-bold uppercase tracking-wider text-nb-text">
        {{ t('invite.title') }}
      </h1>
      <p class="font-mono text-xs text-nb-muted">
        {{ t('invite.desc') }}
      </p>
    </div>

    <!-- Link box -->
    <div class="w-full border-2 border-nb-border bg-nb-surface shadow-[var(--nb-shadow)] flex flex-col">
      <!-- Board ID row -->
      <div class="border-b-2 border-nb-border px-4 py-2 flex items-center gap-3">
        <span class="font-mono text-xs text-nb-muted uppercase tracking-wide shrink-0">
          {{ t('invite.boardId') }}
        </span>
        <code class="font-mono text-xs font-bold text-nb-text truncate">{{ boardId }}</code>
      </div>

      <!-- Link row -->
      <div class="px-4 py-3 flex flex-col gap-2">
        <label class="font-mono text-xs text-nb-muted uppercase tracking-wide">
          {{ t('invite.linkLabel') }}
        </label>
        <div class="flex gap-2">
          <input
            id="invite-link-input"
            :value="inviteLink"
            readonly
            class="flex-1 min-w-0 bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-xs px-3 py-2 outline-none select-all cursor-text truncate"
          />
          <AppButton variant="primary" size="sm" @click="copyLink">
            {{ copied ? t('invite.copied') : t('invite.copy') }}
          </AppButton>
        </div>
      </div>
    </div>

    <!-- Hint -->
    <p class="font-mono text-xs text-nb-muted">
      {{ t('invite.hint') }}
    </p>
  </div>
</template>
