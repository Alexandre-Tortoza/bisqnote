<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppButton from '@/components/ui/AppButton.vue'
import { useUserAuth } from '../composables/useUserAuth'

const emit = defineEmits<{
  authenticated: []
}>()

const { t } = useI18n()
const { register, login, loading, error } = useUserAuth()

type Tab = 'register' | 'login'
const activeTab = ref<Tab>('register')

const username = ref('')
const password = ref('')
const passwordConfirm = ref('')
const submitted = ref(false)
const usernameError = ref('')
const passwordError = ref('')
const passwordConfirmError = ref('')

function switchTab(tab: Tab) {
  activeTab.value = tab
  username.value = ''
  password.value = ''
  passwordConfirm.value = ''
  submitted.value = false
  usernameError.value = ''
  passwordError.value = ''
  passwordConfirmError.value = ''
}

function validate(): boolean {
  usernameError.value = username.value.trim() ? '' : t('auth.errorUsernameRequired')
  passwordError.value = password.value ? '' : t('auth.errorPasswordRequired')
  if (activeTab.value === 'register') {
    passwordConfirmError.value =
      passwordConfirm.value === password.value ? '' : t('auth.errorPasswordMismatch')
  }
  return !usernameError.value && !passwordError.value && !passwordConfirmError.value
}

function onInput() {
  if (submitted.value) validate()
}

async function handleSubmit() {
  submitted.value = true
  if (!validate()) return

  const success =
    activeTab.value === 'register'
      ? await register(username.value.trim(), password.value)
      : await login(username.value.trim(), password.value)

  if (success) emit('authenticated')
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Tab switcher -->
    <div class="flex border-b-2 border-nb-border">
      <button
        type="button"
        class="flex-1 font-mono text-xs font-bold uppercase tracking-wider py-2 transition-colors"
        :class="activeTab === 'register'
          ? 'text-nb-accent border-b-2 border-nb-accent -mb-[2px]'
          : 'text-nb-muted hover:text-nb-text'"
        @click="switchTab('register')"
      >
        {{ t('auth.tabCreate') }}
      </button>
      <button
        type="button"
        class="flex-1 font-mono text-xs font-bold uppercase tracking-wider py-2 transition-colors"
        :class="activeTab === 'login'
          ? 'text-nb-accent border-b-2 border-nb-accent -mb-[2px]'
          : 'text-nb-muted hover:text-nb-text'"
        @click="switchTab('login')"
      >
        {{ t('auth.tabLogin') }}
      </button>
    </div>

    <!-- Form -->
    <form class="flex flex-col gap-4" novalidate @submit.prevent="handleSubmit">
      <!-- Username -->
      <div class="flex flex-col gap-1">
        <label
          for="auth-username"
          class="font-mono text-xs font-bold uppercase tracking-wider text-nb-text"
        >
          {{ t('auth.labelUsername') }} <span class="text-nb-accent">*</span>
        </label>
        <input
          id="auth-username"
          v-model="username"
          name="username"
          type="text"
          :placeholder="t('auth.placeholderUsername')"
          autocomplete="username"
          autofocus
          class="bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-sm px-3 py-2 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] transition-all duration-100 placeholder:text-nb-muted w-full"
          @input="onInput"
        />
        <span v-if="usernameError" class="font-mono text-xs text-nb-accent font-bold">
          {{ usernameError }}
        </span>
      </div>

      <!-- Password -->
      <div class="flex flex-col gap-1">
        <label
          for="auth-password"
          class="font-mono text-xs font-bold uppercase tracking-wider text-nb-text"
        >
          {{ t('auth.labelPassword') }} <span class="text-nb-accent">*</span>
        </label>
        <input
          id="auth-password"
          v-model="password"
          name="password"
          type="password"
          :placeholder="t('auth.placeholderPassword')"
          autocomplete="new-password"
          class="bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-sm px-3 py-2 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] transition-all duration-100 placeholder:text-nb-muted w-full"
          @input="onInput"
        />
        <span v-if="passwordError" class="font-mono text-xs text-nb-accent font-bold">
          {{ passwordError }}
        </span>
      </div>

      <!-- Confirm password (register only) -->
      <div v-if="activeTab === 'register'" class="flex flex-col gap-1">
        <label
          for="auth-password-confirm"
          class="font-mono text-xs font-bold uppercase tracking-wider text-nb-text"
        >
          {{ t('auth.labelPasswordConfirm') }} <span class="text-nb-accent">*</span>
        </label>
        <input
          id="auth-password-confirm"
          v-model="passwordConfirm"
          name="passwordConfirm"
          type="password"
          :placeholder="t('auth.placeholderPasswordConfirm')"
          autocomplete="new-password"
          class="bg-nb-bg border-2 border-nb-border text-nb-text font-mono text-sm px-3 py-2 outline-none shadow-[var(--nb-shadow-sm)] focus:shadow-[var(--nb-shadow)] transition-all duration-100 placeholder:text-nb-muted w-full"
          @input="onInput"
        />
        <span v-if="passwordConfirmError" class="font-mono text-xs text-nb-accent font-bold">
          {{ passwordConfirmError }}
        </span>
      </div>

      <!-- API error -->
      <p v-if="error" class="font-mono text-xs text-nb-accent font-bold">{{ error }}</p>

      <!-- Submit -->
      <div class="flex justify-end pt-2 border-t-2 border-nb-border">
        <AppButton type="submit" variant="primary" size="md" :disabled="loading">
          {{ loading ? t('auth.submitting') : (activeTab === 'register' ? t('auth.submitRegister') : t('auth.submitLogin')) }}
        </AppButton>
      </div>
    </form>
  </div>
</template>
