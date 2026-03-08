<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/ui/AppButton.vue'
import WindowComponent from '@/components/ui/WindowComponent.vue'

const { t } = useI18n()

const boardId = ref('')
const isPrivate = ref(false)
const password = ref('')
const submitted = ref(false)

const boardIdError = ref('')

function validate(): boolean {
  boardIdError.value = boardId.value.trim() ? '' : t('join.errorBoardId')
  return !boardIdError.value
}

function onBoardIdInput() {
  if (submitted.value) validate()
}

function handleSubmit() {
  submitted.value = true
  if (!validate()) return
  // TODO: call API to join board
}
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] bg-nb-bg flex items-center justify-center px-6 py-16">
    <div class="w-full max-w-lg">
      <WindowComponent :title="t('join.pageTitle')">
      <form
        class="flex flex-col gap-6"
        novalidate
        @submit.prevent="handleSubmit"
      >
        <!-- Board ID -->
        <div class="flex flex-col gap-1">
          <label
            for="join-boardId"
            class="font-mono text-xs font-bold uppercase tracking-wider text-nb-text"
          >
            {{ t('join.labelBoardId') }} <span class="text-nb-accent">{{ t('join.required') }}</span>
          </label>
          <input
            id="join-boardId"
            v-model="boardId"
            name="boardId"
            type="text"
            :placeholder="t('join.placeholderBoardId')"
            autocomplete="off"
            class="bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-sm px-3 py-2 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] transition-all duration-100 placeholder:text-nb-muted w-full"
            @input="onBoardIdInput"
          />
          <span
            v-if="boardIdError"
            data-testid="boardId-error"
            class="font-mono text-xs text-nb-accent font-bold"
          >
            {{ boardIdError }}
          </span>
        </div>

        <!-- Private toggle -->
        <label class="flex items-center gap-3 cursor-pointer group">
          <input
            v-model="isPrivate"
            name="isPrivate"
            type="checkbox"
            class="w-4 h-4 border-2 border-nb-border bg-nb-bg accent-nb-accent cursor-pointer"
          />
          <span class="font-mono text-sm text-nb-text group-hover:text-nb-accent transition-colors">
            {{ t('join.togglePrivate') }}
          </span>
        </label>

        <!-- Password (conditional) -->
        <div v-if="isPrivate" class="flex flex-col gap-1">
          <label
            for="join-password"
            class="font-mono text-xs font-bold uppercase tracking-wider text-nb-text"
          >
            {{ t('join.labelPassword') }}
          </label>
          <input
            id="join-password"
            v-model="password"
            name="password"
            type="password"
            :placeholder="t('join.placeholderPassword')"
            autocomplete="current-password"
            class="bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-sm px-3 py-2 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] transition-all duration-100 placeholder:text-nb-muted w-full"
          />
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
