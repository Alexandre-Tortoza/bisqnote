import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface UserSession {
  userId: string
  username: string
}

const STORAGE_KEY = 'bisqnode-user'

export const useUserStore = defineStore('user', () => {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  const user = ref<UserSession | null>(stored ? (JSON.parse(stored) as UserSession) : null)

  function setUser(data: UserSession) {
    user.value = data
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    }
  }

  function clearUser() {
    user.value = null
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  function hasUser(): boolean {
    return user.value !== null
  }

  return { user, setUser, clearUser, hasUser }
})
