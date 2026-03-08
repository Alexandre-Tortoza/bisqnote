<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/ui/AppButton.vue'
import WindowComponent from '@/components/ui/WindowComponent.vue'

const { t } = useI18n()

const name = ref('')
const isPrivate = ref(false)
const password = ref('')
const submitted = ref(false)

const nameError = ref('')

function validate(): boolean {
  nameError.value = name.value.trim() ? '' : t('create.errorName')
  return !nameError.value
}

function onNameInput() {
  if (submitted.value) validate()
}

function handleSubmit() {
  submitted.value = true
  if (!validate()) return
  // TODO: call API to create board
}
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] bg-nb-bg flex items-center justify-center px-6 py-16">
    <div class="w-full max-w-lg">
      <WindowComponent :title="t('create.pageTitle')">
      <form
        class="flex flex-col gap-6"
        novalidate
        @submit.prevent="handleSubmit"
      >
        <!-- Name -->
        <div class="flex flex-col gap-1">
          <label
            for="create-name"
            class="font-mono text-xs font-bold uppercase tracking-wider text-nb-text"
          >
            {{ t('create.labelName') }} <span class="text-nb-accent">{{ t('create.required') }}</span>
          </label>
          <input
            id="create-name"
            v-model="name"
            name="name"
            type="text"
            :placeholder="t('create.placeholderName')"
            autocomplete="off"
            class="bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-sm px-3 py-2 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] transition-all duration-100 placeholder:text-nb-muted w-full"
            @input="onNameInput"
          />
          <span
            v-if="nameError"
            data-testid="name-error"
            class="font-mono text-xs text-nb-accent font-bold"
          >
            {{ nameError }}
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
            {{ t('create.togglePrivate') }}
          </span>
        </label>

        <!-- Password (conditional) -->
        <div v-if="isPrivate" class="flex flex-col gap-1">
          <label
            for="create-password"
            class="font-mono text-xs font-bold uppercase tracking-wider text-nb-text"
          >
            {{ t('create.labelPassword') }}
          </label>
          <input
            id="create-password"
            v-model="password"
            name="password"
            type="password"
            :placeholder="t('create.placeholderPassword')"
            autocomplete="new-password"
            class="bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-sm px-3 py-2 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] transition-all duration-100 placeholder:text-nb-muted w-full"
          />
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-between pt-2 border-t-2 border-nb-border">
          <RouterLink to="/" class="font-mono text-xs text-nb-muted hover:text-nb-text transition-colors">
            {{ t('create.back') }}
          </RouterLink>
          <AppButton type="submit" variant="primary" size="md">{{ t('create.submit') }}</AppButton>
        </div>
      </form>
      </WindowComponent>
    </div>
  </div>
</template>
