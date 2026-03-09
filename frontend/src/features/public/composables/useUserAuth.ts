import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/services/api'
import { ApiError } from '@/services/ApiError'
import { useUserStore } from '@/stores/user'

interface UserAuthResponse {
  userId: string
  userToken: string
  username: string
}

export function useUserAuth() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const userStore = useUserStore()
  const { t } = useI18n()

  async function register(username: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const result = await api.post<UserAuthResponse>('/api/users/register', { username, password })
      userStore.setUser(result)
      return true
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          error.value = t('auth.errorUsernameTaken')
        } else if (err.status >= 500) {
          error.value = t('errors.serverError')
        } else {
          error.value = err.message
        }
      } else {
        error.value = t('auth.errorRegisterUnknown')
      }
      return false
    } finally {
      loading.value = false
    }
  }

  async function login(username: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const result = await api.post<UserAuthResponse>('/api/users/login', { username, password })
      userStore.setUser(result)
      return true
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          error.value = t('auth.errorInvalidCredentials')
        } else if (err.status >= 500) {
          error.value = t('errors.serverError')
        } else {
          error.value = err.message
        }
      } else {
        error.value = t('auth.errorLoginUnknown')
      }
      return false
    } finally {
      loading.value = false
    }
  }

  return { register, login, loading, error }
}
