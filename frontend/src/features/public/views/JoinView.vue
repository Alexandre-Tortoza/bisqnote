<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/ui/AppButton.vue'
import WindowComponent from '@/components/ui/WindowComponent.vue'

const { t } = useI18n()
const router = useRouter()

const input = ref('')
const submitted = ref(false)
const inputError = ref('')

/** Extracts a board UUID from a full URL or returns the plain input trimmed. */
function extractBoardId(value: string): string {
  try {
    const url = new URL(value.trim())
    const parts = url.pathname.split('/')
    const boardIdx = parts.indexOf('board')
    if (boardIdx !== -1 && parts[boardIdx + 1]) return parts[boardIdx + 1]!
  } catch {
    // Not a URL — use as-is
  }
  return value.trim()
}

function validate(): boolean {
  inputError.value = input.value.trim() ? '' : t('join.errorBoardId')
  return !inputError.value
}

function onInput() {
  if (submitted.value) validate()
}

function handleSubmit() {
  submitted.value = true
  if (!validate()) return
  const boardId = extractBoardId(input.value)
  router.push({ name: 'board-enter', params: { id: boardId } })
}
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] bg-nb-bg flex items-center justify-center px-6 py-16">
    <div class="w-full max-w-lg">
      <WindowComponent :title="t('join.pageTitle')">
        <form class="flex flex-col gap-6" novalidate @submit.prevent="handleSubmit">
          <!-- Board ID or link -->
          <div class="flex flex-col gap-1">
            <label
              for="join-boardId"
              class="font-mono text-xs font-bold uppercase tracking-wider text-nb-text"
            >
              {{ t('join.labelBoardId') }} <span class="text-nb-accent">{{ t('join.required') }}</span>
            </label>
            <input
              id="join-boardId"
              v-model="input"
              name="boardId"
              type="text"
              :placeholder="t('join.placeholderBoardId')"
              autocomplete="off"
              class="bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-sm px-3 py-2 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] transition-all duration-100 placeholder:text-nb-muted w-full"
              @input="onInput"
            />
            <span
              v-if="inputError"
              data-testid="boardId-error"
              class="font-mono text-xs text-nb-accent font-bold"
            >
              {{ inputError }}
            </span>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between pt-2 border-t-2 border-nb-border">
            <RouterLink to="/" class="font-mono text-xs text-nb-muted hover:text-nb-text transition-colors">
              {{ t('join.back') }}
            </RouterLink>
            <AppButton type="submit" variant="primary" size="md">{{ t('join.submit') }}</AppButton>
          </div>
        </form>
      </WindowComponent>
    </div>
  </div>
</template>
