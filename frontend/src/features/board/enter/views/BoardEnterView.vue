<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useJoinBoard, UserAuthStep } from '@/features/public'
import type { BoardMeta } from '@/features/public'
import { useUserStore } from '@/stores/user'
import AppInput from '@/components/ui/AppInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import WindowComponent from '@/components/ui/WindowComponent.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const boardId = route.params['id'] as string
const userStore = useUserStore()
const { getBoardMeta, joinBoard, loading, error } = useJoinBoard()

const meta = ref<BoardMeta | null>(null)
const notFound = ref(false)
const loadingMeta = ref(true)
const password = ref('')
const passwordError = ref('')

onMounted(async () => {
  const result = await getBoardMeta(boardId)
  loadingMeta.value = false
  if (!result) {
    notFound.value = true
    return
  }
  meta.value = result
})

const showAuthStep = computed(
  () => !loadingMeta.value && !notFound.value && meta.value !== null && !userStore.user,
)

const showEnterForm = computed(
  () => !loadingMeta.value && !notFound.value && meta.value !== null && !!userStore.user,
)

async function handleEnter() {
  if (meta.value?.isPrivate && !password.value) {
    passwordError.value = t('enter.errorPassword')
    return
  }
  passwordError.value = ''
  await joinBoard(boardId, meta.value!.name, meta.value?.isPrivate ? password.value : undefined)
}
</script>

<template>
  <div class="min-h-screen bg-nb-bg flex items-center justify-center px-6 py-16">
    <div class="w-full max-w-lg">
      <!-- Loading -->
      <p v-if="loadingMeta" class="font-mono text-sm text-nb-muted text-center">
        {{ t('enter.loading') }}
      </p>

      <!-- Not found -->
      <WindowComponent v-else-if="notFound" :title="t('enter.titleNotFound')">
        <div class="flex flex-col gap-6">
          <p class="font-mono text-sm text-nb-muted">{{ t('enter.descNotFound') }}</p>
          <div class="pt-2 border-t-2 border-nb-border">
            <AppButton data-testid="back-home-btn" variant="ghost" size="md" @click="router.push('/')">
              {{ t('enter.backHome') }}
            </AppButton>
          </div>
        </div>
      </WindowComponent>

      <!-- Auth step (unauthenticated) -->
      <WindowComponent v-else-if="showAuthStep" :title="t('auth.title')">
        <div class="flex flex-col gap-6">
          <p class="font-mono text-xs text-nb-muted">{{ t('auth.desc') }}</p>
          <UserAuthStep />
        </div>
      </WindowComponent>

      <!-- Enter form -->
      <WindowComponent v-else-if="showEnterForm" :title="t('enter.title')">
        <form class="flex flex-col gap-6" novalidate @submit.prevent="handleEnter">
          <p class="font-mono text-sm text-nb-text">
            <span class="text-nb-muted">{{ t('enter.boardLabel') }}</span>{{ meta?.name }}
          </p>

          <!-- Password (private boards only) -->
          <AppInput
            v-if="meta?.isPrivate"
            v-model="password"
            name="password"
            type="password"
            :label="t('enter.labelPassword')"
            :placeholder="t('enter.placeholderPassword')"
            :error="passwordError"
            autocomplete="current-password"
          />

          <!-- API error -->
          <p v-if="error" class="font-mono text-xs text-nb-accent font-bold">{{ error }}</p>

          <!-- Actions -->
          <div class="flex items-center justify-between pt-2 border-t-2 border-nb-border">
            <button
              type="button"
              data-testid="back-btn"
              class="font-mono text-xs text-nb-muted hover:text-nb-text transition-colors"
              @click="router.push('/')"
            >
              {{ t('enter.back') }}
            </button>
            <AppButton type="submit" variant="primary" size="md" :disabled="loading">
              {{ loading ? t('enter.submitting') : t('enter.submit') }}
            </AppButton>
          </div>
        </form>
      </WindowComponent>
    </div>
  </div>
</template>
