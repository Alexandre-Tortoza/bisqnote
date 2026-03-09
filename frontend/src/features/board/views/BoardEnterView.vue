<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/stores/session'
import { useJoinBoard, type BoardMeta } from '@/features/public/composables/useJoinBoard'
import AppButton from '@/components/ui/AppButton.vue'
import WindowComponent from '@/components/ui/WindowComponent.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import LocaleToggle from '@/components/ui/LocaleToggle.vue'

const { t } = useI18n()
const route = useRoute()
const session = useSessionStore()
const { getBoardMeta, joinBoard, loading, error } = useJoinBoard()

const boardId = route.params['id'] as string

const meta = ref<BoardMeta | null>(null)
const notFound = ref(false)
const password = ref('')
const submitted = ref(false)
const passwordError = ref('')

onMounted(async () => {
  if (session.hasSession(boardId)) {
    await joinBoard(boardId)
    return
  }

  try {
    const result = await getBoardMeta(boardId)
    if (!result) {
      notFound.value = true
      return
    }
    meta.value = result
    if (!result.isPrivate) {
      await joinBoard(boardId)
    }
  } catch {
    notFound.value = true
  }
})

function validate(): boolean {
  passwordError.value = password.value.trim() ? '' : t('enter.errorPassword')
  return !passwordError.value
}

async function handleSubmit() {
  submitted.value = true
  if (!validate()) return
  await joinBoard(boardId, password.value)
}

function onPasswordInput() {
  if (submitted.value) validate()
}
</script>

<template>
  <div class="min-h-screen bg-nb-bg flex flex-col">
    <!-- Minimal header with theme/locale toggles -->
    <header class="h-14 border-b-2 border-nb-border flex items-center justify-between px-6">
      <RouterLink to="/" class="font-mono text-sm font-bold text-nb-text hover:text-nb-accent transition-colors uppercase tracking-widest">
        BISQNODE
      </RouterLink>
      <div class="flex items-center gap-2">
        <LocaleToggle />
        <ThemeToggle />
      </div>
    </header>

    <!-- Content -->
    <div class="flex-1 flex items-center justify-center px-6 py-16">
      <!-- Not found state -->
      <div v-if="notFound" class="w-full max-w-lg">
        <WindowComponent :title="t('enter.titleNotFound')">
          <p class="font-mono text-sm text-nb-muted mb-6">{{ t('enter.descNotFound') }}</p>
          <RouterLink to="/" class="font-mono text-xs text-nb-accent hover:underline">
            ← {{ t('enter.backHome') }}
          </RouterLink>
        </WindowComponent>
      </div>

      <!-- Loading / auto-joining public board -->
      <div v-else-if="!meta || (!meta.isPrivate && !error)" class="font-mono text-sm text-nb-muted animate-pulse">
        {{ t('enter.loading') }}
      </div>

      <!-- Password form for private boards -->
      <div v-else-if="meta.isPrivate" class="w-full max-w-lg">
        <WindowComponent :title="t('enter.title')">
          <form class="flex flex-col gap-6" novalidate @submit.prevent="handleSubmit">
            <p class="font-mono text-xs text-nb-muted">
              {{ t('enter.boardLabel') }}
              <span class="text-nb-text font-bold">{{ meta.name }}</span>
            </p>

            <!-- Password -->
            <div class="flex flex-col gap-1">
              <label
                for="enter-password"
                class="font-mono text-xs font-bold uppercase tracking-wider text-nb-text"
              >
                {{ t('enter.labelPassword') }} <span class="text-nb-accent">*</span>
              </label>
              <input
                id="enter-password"
                v-model="password"
                name="password"
                type="password"
                :placeholder="t('enter.placeholderPassword')"
                autocomplete="current-password"
                autofocus
                class="bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-sm px-3 py-2 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] transition-all duration-100 placeholder:text-nb-muted w-full"
                @input="onPasswordInput"
              />
              <span
                v-if="passwordError"
                class="font-mono text-xs text-nb-accent font-bold"
              >
                {{ passwordError }}
              </span>
            </div>

            <!-- Server error -->
            <p v-if="error" class="font-mono text-xs text-nb-accent font-bold">{{ error }}</p>

            <!-- Actions -->
            <div class="flex items-center justify-between pt-2 border-t-2 border-nb-border">
              <RouterLink to="/" class="font-mono text-xs text-nb-muted hover:text-nb-text transition-colors">
                {{ t('enter.back') }}
              </RouterLink>
              <AppButton type="submit" variant="primary" size="md" :disabled="loading">
                {{ loading ? t('enter.submitting') : t('enter.submit') }}
              </AppButton>
            </div>
          </form>
        </WindowComponent>
      </div>

      <!-- Error state (e.g. server error during join) -->
      <div v-else-if="error" class="w-full max-w-lg">
        <WindowComponent :title="t('enter.titleError')">
          <p class="font-mono text-sm text-nb-accent font-bold mb-6">{{ error }}</p>
          <RouterLink to="/" class="font-mono text-xs text-nb-muted hover:text-nb-text transition-colors">
            ← {{ t('enter.backHome') }}
          </RouterLink>
        </WindowComponent>
      </div>
    </div>
  </div>
</template>
